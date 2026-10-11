const assert = require('node:assert/strict');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { AuthService } = require('../dist/modules/auth/auth.service');
const { JwtStrategy } = require('../dist/modules/auth/strategies/jwt.strategy');
const { RegisterDto, LoginDto, ResetPasswordDto } = { ...require('../dist/modules/auth/dto/register.dto'), ...require('../dist/modules/auth/dto/login.dto') };
const { RefreshTokenSchema } = require('../dist/database/schemas/refresh-token.schema');
module.exports = async function runAuthChecks(connection, test) {
  const User = connection.model('User');
  const Tokens = connection.model('RefreshToken', RefreshTokenSchema); await Tokens.init();
  const jwt = new JwtService();
  const config = new ConfigService({ JWT_ACCESS_SECRET:'isolated-access-test-key', JWT_REFRESH_SECRET:'isolated-refresh-test-key', JWT_ACCESS_EXPIRES_IN:'15m', JWT_REFRESH_EXPIRES_IN:'3d' });
  const auth = new AuthService(User,Tokens,jwt,config); const strategy = new JwtStrategy(config,User);
  const originalFetch = global.fetch;
  let registered;
  await test('Registration validates name, email, phone and password byte limit', async()=>{
    const valid=plainToInstance(RegisterDto,{ name:'  Người   thử  ', email:'  TEST@EXAMPLE.TEST ',password:'Test passphrase 2026',phone:'+84 912 345 678'});
    assert.equal((await validate(valid)).length,0);assert.equal(valid.email,'test@example.test');assert.equal(valid.phone,'0912345678');assert.equal(valid.name,'Người thử');
    for(const data of [{name:' '},{email:'invalid'},{phone:'123'},{password:'1234567'},{password:'á'.repeat(40)}]) assert((await validate(plainToInstance(RegisterDto,{name:'Người thử',email:'valid@example.test',password:'Long enough passphrase',...data}))).length);
    assert.equal((await validate(plainToInstance(LoginDto,{email:'test@example.test',password:'legacy'}))).length,0);
    assert((await validate(plainToInstance(ResetPasswordDto,{token:'bad',password:'good password'}))).length);
  });
  await test('Registration creates customer, normalizes email and hides password',async()=>{
    registered=await auth.register({name:'Auth Test',email:' Auth@Test.Example ',password:'First passphrase 2026',phone:'0912345678',role:'ADMIN'});
    assert.equal(registered.user.role,'CUSTOMER');assert.equal(registered.user.email,'auth@test.example');assert.equal(registered.user.password,undefined);
    assert.equal(registered.user.loyaltyPoints,100);
    assert.notEqual((await User.findById(registered.user._id)).password,'First passphrase 2026');
    await assert.rejects(()=>auth.register({name:'Duplicate',email:'AUTH@test.example',password:'otherpassword'}),e=>e.status===409);
  });
  await test('Login rejects wrong credentials and disabled users',async()=>{
    await assert.rejects(()=>auth.login({email:'auth@test.example',password:'wrong'}),e=>e.status===401);
    await assert.rejects(()=>auth.login({email:'missing@test.example',password:'wrong'}),e=>e.status===401);
    await User.updateOne({_id:registered.user._id},{$set:{isActive:false}});
    await assert.rejects(()=>auth.login({email:'auth@test.example',password:'First passphrase 2026'}),e=>e.status===401);
    await User.updateOne({_id:registered.user._id},{$set:{isActive:true}});
    const session=await auth.login({email:' AUTH@TEST.EXAMPLE ',password:'First passphrase 2026'});assert(session.accessToken);
  });
  await test('Refresh tokens hashed, expiry matches JWT, single use under concurrent refresh',async()=>{
    assert.equal(await Tokens.countDocuments({token:registered.refreshToken}),0);
    const saved=await Tokens.findOne({userId:registered.user._id});assert.equal(saved.token.length,64);
    assert.equal(saved.expiresAt.getTime(),jwt.decode(registered.refreshToken).exp*1000);
    const results=await Promise.allSettled([auth.refreshTokens(registered.refreshToken),auth.refreshTokens(registered.refreshToken)]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    await assert.rejects(()=>auth.refreshTokens(registered.accessToken),e=>e.status===401);
    await assert.rejects(()=>auth.refreshTokens('not-a-token'),e=>e.status===401);
  });
  await test('Logout revokes access and refresh sessions, including expired access logout',async()=>{
    const session=await auth.login({email:'auth@test.example',password:'First passphrase 2026'});
    await strategy.validate(jwt.decode(session.accessToken));
    await auth.logout(undefined,session.refreshToken);
    await assert.rejects(()=>strategy.validate(jwt.decode(session.accessToken)),e=>e.status===401);
    await assert.rejects(()=>auth.refreshTokens(session.refreshToken),e=>e.status===401);
  });
  await test('Forgot password requires configured delivery and does not expose account existence',async()=>{
    await assert.rejects(()=>auth.forgotPassword('auth@test.example'),e=>e.status===503);
    config.set('AUTH_EMAIL_URL','https://mail.example.test/send');config.set('AUTH_EMAIL_TOKEN','test-mail-key');config.set('FRONTEND_URL','https://shop.example.test');
    let message;global.fetch=async(_url,opts)=>{message=JSON.parse(opts.body);return{ok:true};};
    const known=await auth.forgotPassword('auth@test.example');const unknown=await auth.forgotPassword('missing@test.example');assert.deepEqual(known,unknown);
    assert.equal(message.to,'auth@test.example');assert(message.text.includes('https://shop.example.test/reset-password#token='));
    const raw=message.text.match(/token=([a-f0-9]{64})/)[1];
    const stored=await User.findById(registered.user._id).select('+passwordResetHash');assert.notEqual(stored.passwordResetHash,raw);
    const session=await auth.login({email:'auth@test.example',password:'First passphrase 2026'});
    await auth.resetPassword(raw,'Second passphrase 2026');
    await assert.rejects(()=>auth.resetPassword(raw,'Third passphrase 2026'),e=>e.status===400);
    await assert.rejects(()=>auth.login({email:'auth@test.example',password:'First passphrase 2026'}),e=>e.status===401);
    assert((await auth.login({email:'auth@test.example',password:'Second passphrase 2026'})).accessToken);
    await assert.rejects(()=>strategy.validate(jwt.decode(session.accessToken)),e=>e.status===401);
    await assert.rejects(()=>auth.refreshTokens(session.refreshToken),e=>e.status===401);
  });
  await test('Expired reset link and failed email delivery cannot reset password',async()=>{
    await User.updateOne({_id:registered.user._id},{$unset:{passwordResetRequestedAt:1}});
    let raw;global.fetch=async(_url,opts)=>{raw=JSON.parse(opts.body).text.match(/token=([a-f0-9]{64})/)[1];return{ok:true};};
    await auth.forgotPassword('auth@test.example');await User.updateOne({_id:registered.user._id},{$set:{passwordResetExpiresAt:new Date(Date.now()-1000)}});
    await assert.rejects(()=>auth.resetPassword(raw,'Third passphrase 2026'),e=>e.status===400);
    await User.updateOne({_id:registered.user._id},{$unset:{passwordResetRequestedAt:1}});
    global.fetch=async()=>({ok:false});await auth.forgotPassword('auth@test.example');
    assert.equal((await User.findById(registered.user._id).select('+passwordResetHash')).passwordResetHash,undefined);
  });
  global.fetch=originalFetch;
};
