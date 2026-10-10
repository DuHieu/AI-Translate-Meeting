/**
 * Centralized Legal & Enterprise Information for MOIT Compliance
 * (Bộ Công Thương - Cổng dịch vụ công dichvucong.moit.gov.vn & online.gov.vn)
 *
 * Quản lý tập trung thông tin pháp nhân Doanh nghiệp đăng ký thẩm duyệt với Bộ Công Thương.
 * Phương thức thanh toán được xử lý 100% tự động qua Cổng thanh toán trực tuyến (không dùng STK thủ công).
 */

export interface BusinessInfo {
  /** Loại hình chủ thể: Doanh nghiệp */
  entityType: 'enterprise';
  /** Tên đầy đủ của Doanh nghiệp (theo Giấy chứng nhận Đăng ký Doanh nghiệp) */
  companyName: string;
  /** Tên giao dịch quốc tế / Thương hiệu */
  brandName: string;
  /** Người đại diện theo pháp luật / Giám đốc điều hành */
  legalRepresentative: string;
  /** Tên chủ sở hữu / Đăng ký */
  ownerName: string;
  /** Mã số doanh nghiệp / Mã số thuế (MST) */
  taxId: string;
  /** Ngày cấp Giấy chứng nhận ĐKDN */
  taxIssuedDate: string;
  /** Cơ quan cấp Giấy chứng nhận ĐKDN */
  taxIssuedPlace: string;
  /** Địa chỉ trụ sở chính (theo ĐKKD) */
  address: string;
  /** Địa chỉ văn phòng giao dịch / R&D */
  officeAddress: string;
  /** Số điện thoại hotline tiếp nhận hỗ trợ & kiểm tra thẩm định */
  hotline: string;
  /** Email doanh nghiệp đăng ký với Bộ Công Thương */
  email: string;
  /** Email hỗ trợ khách hàng */
  supportEmail: string;
  /** Thời gian làm việc hỗ trợ khách hàng */
  workingHours: string;
  /** Trạng thái xét duyệt hồ sơ tại Bộ Công Thương: 'pending' (đang chờ duyệt) | 'registered' (đã duyệt) */
  moitStatus: 'pending' | 'registered';
  /** Liên kết tra cứu cổng online.gov.vn */
  moitVerifyUrl: string;
  /** Phương thức thanh toán: 100% Cổng tự động nhanh (VietQR Dynamic & Thẻ quốc tế & Ví điện tử) */
  paymentMethodType: 'automated_gateway';
}

export const BUSINESS_INFO: BusinessInfo = {
  entityType: 'enterprise',
  companyName: 'Công ty Cổ phần Công nghệ LayaMeet',
  brandName: 'LayaMeet AI Solutions',
  legalRepresentative: 'Dư Văn Hiệu',
  ownerName: 'Dư Văn Hiệu',
  taxId: '0110892345', // Mã số doanh nghiệp / MST
  taxIssuedDate: '15/01/2024',
  taxIssuedPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
  address: 'Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Phường Mễ Trì, Quận Nam Từ Liêm, TP. Hà Nội, Việt Nam',
  officeAddress: 'Keangnam Landmark 72, Nam Từ Liêm, Hà Nội · Chi nhánh: Tòa nhà FPT Complex, Ngũ Hành Sơn, Đà Nẵng',
  hotline: '0988 123 456',
  email: 'contact@layameet.com',
  supportEmail: 'support@layameet.com',
  workingHours: '08:00 - 18:00 (Thứ 2 - Thứ 7, trừ ngày lễ Tết)',
  moitStatus: 'pending', // Hiện tại tài khoản doanh nghiệp mới nộp và đang chờ Bộ Công Thương phê duyệt
  moitVerifyUrl: 'http://online.gov.vn/',
  paymentMethodType: 'automated_gateway',
};
