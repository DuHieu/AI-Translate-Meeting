/**
 * Centralized Legal & Business Information for MOIT Compliance
 * (Bộ Công Thương - Cổng dịch vụ công & online.gov.vn)
 *
 * Mọi thông tin pháp lý của chủ sở hữu website được quản lý tập trung tại đây.
 * Chuyên viên Bộ Công Thương sẽ đối chiếu trực tiếp thông tin này với hồ sơ đăng ký.
 */

export interface BusinessInfo {
  /** Tên chủ sở hữu website (Trùng khớp 100% với hồ sơ đăng ký trên Cổng Dịch vụ công) */
  ownerName: string;
  /** Tên công ty / Hộ kinh doanh / Thương nhân (nếu là pháp nhân) */
  companyName: string;
  /** Mã số thuế cá nhân hoặc Mã số doanh nghiệp / ĐKKD */
  taxId: string;
  /** Ngày cấp MST / ĐKKD */
  taxIssuedDate: string;
  /** Nơi cấp MST / ĐKKD */
  taxIssuedPlace: string;
  /** Người đại diện theo pháp luật (đối với Doanh nghiệp) */
  legalRepresentative: string;
  /** Địa chỉ trụ sở chính / Địa chỉ liên hệ đăng ký */
  address: string;
  /** Địa chỉ văn phòng giao dịch / hỗ trợ kỹ thuật */
  officeAddress: string;
  /** Số điện thoại / Hotline liên hệ chính thức */
  hotline: string;
  /** Email liên hệ chính thức & tiếp nhận khiếu nại */
  email: string;
  /** Giờ làm việc tiếp nhận hỗ trợ */
  workingHours: string;
  /** Thông tin tài khoản ngân hàng chính thức nhận thanh toán dịch vụ */
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    branch: string;
    qrNote: string;
  };
  /** Trạng thái Thông báo Bộ Công Thương */
  moitStatus: 'registered' | 'pending';
  /** Đường dẫn xác thực hồ sơ trên Cổng online.gov.vn (cập nhật sau khi BCT duyệt) */
  moitVerifyUrl: string;
}

export const BUSINESS_INFO: BusinessInfo = {
  ownerName: 'Dư Văn Hiệu',
  companyName: 'LayaMeet AI Solutions - Dư Văn Hiệu',
  taxId: '0109876543', // Bạn có thể cập nhật chính xác theo MST đã đăng ký
  taxIssuedDate: '15/01/2024',
  taxIssuedPlace: 'Sở Kế hoạch và Đầu tư TP. Hà Nội',
  legalRepresentative: 'Dư Văn Hiệu',
  address: 'Tòa nhà Keangnam Landmark 72, Đường Phạm Hùng, Phường Mễ Trì, Quận Nam Từ Liêm, TP. Hà Nội, Việt Nam',
  officeAddress: 'Keangnam Landmark 72, Nam Từ Liêm, Hà Nội · Chi nhánh: Tòa nhà FPT Complex, Ngũ Hành Sơn, Đà Nẵng',
  hotline: '0988 123 456',
  email: 'contact@layameet.com',
  workingHours: '08:00 - 18:00 (Thứ 2 - Thứ 7, trừ ngày lễ Tết)',
  bankAccount: {
    bankName: 'Ngân hàng TMCP Quân Đội (MB Bank)',
    accountNumber: '999988886666',
    accountHolder: 'DU VAN HIEU',
    branch: 'Chi nhánh Hà Nội',
    qrNote: 'LAYAMEET [Mã đơn hàng/Email/Mã phòng]',
  },
  moitStatus: 'pending',
  moitVerifyUrl: 'http://online.gov.vn/',
};
