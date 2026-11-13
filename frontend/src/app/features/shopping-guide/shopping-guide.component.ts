import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-shopping-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './shopping-guide.component.html',
  styleUrls: ['./shopping-guide.component.css'],
})
export class ShoppingGuideComponent {
  custom = signal(false);
  expandedFaq = signal<number | null>(0);
  readonly standardSteps = [
    {
      icon: 'redeem',
      title: 'Chọn món quà phù hợp',
      desc: 'Khám phá sản phẩm, đọc mô tả, chọn phân loại và số lượng rồi thêm vào giỏ hàng.',
      tip: 'Kiểm tra đúng màu và mẫu bạn muốn.',
    },
    {
      icon: 'local_shipping',
      title: 'Điền thông tin nhận quà',
      desc: 'Nhập tên, số điện thoại và địa chỉ nhận hàng. Chọn mẫu thiệp và viết lời chúc tại bước thanh toán.',
      tip: 'Có thể gửi trực tiếp đến người nhận.',
    },
    {
      icon: 'payments',
      title: 'Xác nhận & thanh toán',
      desc: 'Kiểm tra tổng tiền, phí giao hàng và ưu đãi. Chọn thanh toán trực tuyến toàn bộ hoặc COD khi nhận hàng.',
      tip: 'Quà có sẵn chọn COD không cần cọc.',
    },
    {
      icon: 'package_2',
      title: 'Theo dõi & nhận quà',
      desc: 'Lưu mã đơn để theo dõi tiến độ. Khi nhận hàng, kiểm tra sản phẩm và liên hệ hỗ trợ nếu có vấn đề.',
      tip: 'Tra cứu tại mục Đơn hàng.',
    },
  ];
  readonly customSteps = [
    {
      icon: 'redeem',
      title: 'Chọn phôi quà',
      desc: 'Vào Custom Studio, chọn sản phẩm phù hợp với ý tưởng và người bạn muốn gửi tặng.',
      tip: 'Bắt đầu từ một món quà bạn yêu thích.',
    },
    {
      icon: 'draw',
      title: 'Thiết kế dấu ấn riêng',
      desc: 'Thêm chữ, hình ảnh và sắp xếp thiết kế. Xem trước, kiểm tra chính tả rồi thêm sản phẩm vào giỏ.',
      tip: 'Rà soát kỹ tên, ngày và nội dung khắc.',
    },
    {
      icon: 'payments',
      title: 'Xác nhận & đặt cọc',
      desc: 'Chọn COD để cọc 50% tiền sản phẩm Custom qua QR; hoặc chọn thanh toán trực tuyến 100% tổng đơn.',
      tip: 'Số tiền chính xác hiển thị ở Thanh toán.',
    },
    {
      icon: 'package_2',
      title: 'Chế tác & giao quà',
      desc: 'Theo dõi tiến độ chế tác và giao hàng trong mục Đơn hàng. Nếu chọn COD, thanh toán phần còn lại khi nhận.',
      tip: 'Thời gian phụ thuộc từng sản phẩm.',
    },
  ];
  readonly checklist = [
    'Đúng sản phẩm, phân loại và số lượng',
    'Nội dung thiết kế, tên và lời chúc không sai chính tả',
    'Tên, số điện thoại và địa chỉ người nhận đầy đủ',
    'Đã kiểm tra ưu đãi, phí giao hàng và số tiền thanh toán',
  ];
  readonly faqs = [
    {
      q: 'Tôi có cần tài khoản để đặt hàng không?',
      a: 'Bạn có thể đặt hàng với tư cách khách. Với đơn COD, hệ thống có thể yêu cầu xác minh OTP trước khi xác nhận. Hãy lưu mã đơn và sử dụng đúng thông tin đã đặt để tra cứu hoặc liên hệ hỗ trợ.',
    },
    {
      q: 'Đặt cọc 50% tính trên toàn bộ đơn hàng hay chỉ quà Custom?',
      a: 'Khi chọn COD, khoản cọc được tính bằng 50% tiền sản phẩm Custom, không phải 50% toàn bộ đơn. Tiền sản phẩm có sẵn, phần Custom còn lại và phí giao hàng được tính vào khoản còn lại. Số tiền cuối cùng luôn hiển thị ở bước Thanh toán.',
    },
    {
      q: 'Tôi có thể gửi quà trực tiếp và giấu giá không?',
      a: 'Có. Chọn gửi quà trực tiếp ở bước Thanh toán và điền thông tin người nhận. Chế độ này giấu giá với người nhận và yêu cầu người đặt thanh toán trước 100%, để người nhận không phải trả COD. Bạn cũng có thể chọn thiệp và nhập lời chúc.',
    },
    {
      q: 'Bao lâu thì quà được giao đến?',
      a: 'Thời gian phụ thuộc sản phẩm có sẵn hay cần chế tác, địa chỉ nhận và tình trạng xử lý đơn. Theo dõi tiến độ tại mục Đơn hàng. Nếu cần quà cho một ngày cụ thể, hãy trao đổi với bộ phận hỗ trợ trước khi đặt để kiểm tra khả năng đáp ứng.',
    },
    {
      q: 'Tôi có thể sửa thiết kế hoặc đổi địa chỉ sau khi đặt không?',
      a: 'Hãy liên hệ hỗ trợ sớm và cung cấp mã đơn cùng nội dung cần sửa. Khả năng thay đổi phụ thuộc trạng thái xử lý; thiết kế đã chế tác hoặc đơn đã bàn giao vận chuyển có thể không sửa được. Kiểm tra kỹ trước khi xác nhận để tránh phát sinh.',
    },
    {
      q: 'Nếu sản phẩm bị lỗi hoặc không đúng thiết kế thì làm gì?',
      a: 'Giữ lại bao bì, chụp ảnh hoặc video thể hiện tình trạng sản phẩm, chuẩn bị mã đơn và gửi yêu cầu ở Trung tâm hỗ trợ. Với quà cá nhân hóa, cung cấp thêm bản thiết kế đã đặt để bộ phận hỗ trợ đối chiếu và hướng dẫn phương án xử lý.',
    },
    {
      q: 'Chuyển khoản rồi nhưng đơn chưa cập nhật thì sao?',
      a: 'Kiểm tra số tiền và nội dung chuyển khoản theo hướng dẫn QR của đơn. Không thanh toán lặp lại khi chưa kiểm tra trạng thái. Giữ biên nhận và liên hệ hỗ trợ kèm mã đơn nếu trạng thái chưa được cập nhật.',
    },
  ];
  toggleFaq(index: number) {
    this.expandedFaq.update((current) => (current === index ? null : index));
  }
}
