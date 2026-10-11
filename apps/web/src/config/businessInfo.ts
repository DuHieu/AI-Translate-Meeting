/**
 * Centralized Legal & Contact Information for MOIT Compliance
 * (Bộ Công Thương - Cổng dịch vụ công dichvucong.moit.gov.vn & online.gov.vn)
 *
 * Mọi thông tin liên hệ và định danh chủ sở hữu được quản lý tập trung tại đây.
 * Phương thức thanh toán được xử lý 100% tự động qua Cổng thanh toán trực tuyến nhanh.
 */

export interface BusinessInfo {
  /** Tên chủ sở hữu / Sáng lập viên */
  ownerName: string;
  /** Tên đơn vị / Dự án / Thương hiệu quản lý */
  companyName: string;
  /** Tên thương hiệu hiển thị */
  brandName: string;
  /** Người đại diện */
  legalRepresentative: string;
  /** Mã số thuế / Mã số doanh nghiệp (để trống nếu chưa có) */
  taxId?: string;
  /** Ngày cấp MST / ĐKDN (nếu có) */
  taxIssuedDate?: string;
  /** Cơ quan cấp MST / ĐKDN (nếu có) */
  taxIssuedPlace?: string;
  /** Địa chỉ liên hệ / Trụ sở */
  address: string;
  /** Địa chỉ văn phòng làm việc */
  officeAddress: string;
  /** Số điện thoại hotline tiếp nhận hỗ trợ & kiểm tra thẩm định */
  hotline: string;
  /** Email liên hệ chính thức đăng ký với Bộ Công Thương */
  email: string;
  /** Email hỗ trợ khách hàng */
  supportEmail: string;
  /** Hồ sơ LinkedIn chính thức */
  linkedinUrl?: string;
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
  ownerName: 'LayaMeet Team',
  companyName: 'LayaMeet AI Platform',
  brandName: 'LayaMeet AI',
  legalRepresentative: 'Ban Quản Trị LayaMeet',
  taxId: '', // Mã số doanh nghiệp / ĐKDN
  taxIssuedDate: '',
  taxIssuedPlace: '',
  address: 'Quận Bình Thạnh, TP. Hồ Chí Minh, Việt Nam',
  officeAddress: 'Quận Bình Thạnh, TP. Hồ Chí Minh, Việt Nam',
  hotline: '1900 6868',
  email: 'contact@layameet.com',
  supportEmail: 'support@layameet.com',
  linkedinUrl: '',
  workingHours: '08:00 - 18:00 (Thứ 2 - Thứ 7)',
  moitStatus: 'pending', // Đang trong quá trình nộp / duyệt hồ sơ tại Bộ Công Thương
  moitVerifyUrl: 'http://online.gov.vn/',
  paymentMethodType: 'automated_gateway',
};
