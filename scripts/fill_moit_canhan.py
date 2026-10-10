import asyncio
from playwright.async_api import async_playwright

# THÔNG TIN ĐIỀN FORM (Bạn có thể cập nhật thông tin tại đây)
FORM_DATA = {
    "ho_ten": "",           # Ví dụ: "Dư Văn Hiếu"
    "ngay_sinh": "",        # Định dạng: "dd/mm/yyyy" (ví dụ: "15/08/1998")
    "so_cccd": "",          # Số CCCD 12 số
    "dia_chi": "",          # Địa chỉ chi tiết (Số nhà, tên đường, thôn/xóm)
    "tinh_thanh": "",       # Tên tỉnh/thành phố (Ví dụ: "Hà Nội", "Hồ Chí Minh")
    "so_dien_thoai": "",    # Số điện thoại liên hệ
    "email": "",            # Email nhận phản hồi từ Bộ Công Thương
    "mat_khau": "",         # Mật khẩu (Tối thiểu 8 ký tự: hoa, thường, số, ký tự đặc biệt)
    "file_cccd": ""         # Đường dẫn tuyệt đối đến file ảnh/PDF CCCD (tùy chọn)
}

async def run_fill(data=None):
    if data is None:
        data = FORM_DATA
        
    async with async_playwright() as p:
        # Mở trình duyệt có giao diện (headed)
        browser = await p.chromium.launch(headless=False, slow_mo=100)
        context = await browser.new_context(viewport={"width": 1280, "height": 900})
        page = await context.new_page()
        
        print("Đang truy cập trang đăng ký Bộ Công Thương...")
        await page.goto("https://dichvucong.moit.gov.vn/Register.aspx", timeout=60000)
        
        # 1. Chọn loại hình: CÁ NHÂN (val = '9')
        print("Chọn loại hình: CÁ NHÂN...")
        await page.select_option("#ctl00_cplhContainer_cmbBusinessType", "9")
        
        # Đợi ASP.NET postback hoàn tất cập nhật các trường Cá nhân
        await page.wait_for_selector("#ctl00_cplhContainer_txtPersionName", timeout=15000)
        await asyncio.sleep(1)
        
        # 2. Điền Họ và tên
        if data.get("ho_ten"):
            print(f"Điền Họ tên: {data['ho_ten']}")
            await page.fill("#ctl00_cplhContainer_txtPersionName", data["ho_ten"])
            
        # 3. Điền Ngày sinh
        if data.get("ngay_sinh"):
            print(f"Điền Ngày sinh: {data['ngay_sinh']}")
            await page.fill("#ctl00_cplhContainer_txtPersionBirthDay", data["ngay_sinh"])
            
        # 4. Điền Số CCCD
        if data.get("so_cccd"):
            print(f"Điền CCCD: {data['so_cccd']}")
            await page.fill("#ctl00_cplhContainer_txtPersionNumberId", data["so_cccd"])
            # Tên tài khoản tự động cập nhật hoặc gõ vào
            await page.fill("#ctl00_cplhContainer_txtLoginName", data["so_cccd"])
            
        # 5. Điền Địa chỉ chi tiết
        if data.get("dia_chi"):
            print(f"Điền Địa chỉ: {data['dia_chi']}")
            await page.fill("#ctl00_cplhContainer_txtAdress", data["dia_chi"])
            
        # 6. Chọn Tỉnh / Thành phố (nếu có)
        if data.get("tinh_thanh"):
            try:
                options = await page.eval_on_selector_all("#ctl00_cplhContainer_cmbCity option", "opts => opts.map(o => ({text: o.innerText.trim(), val: o.value}))")
                for opt in options:
                    if data["tinh_thanh"].lower() in opt["text"].lower():
                        await page.select_option("#ctl00_cplhContainer_cmbCity", opt["val"])
                        print(f"Đã chọn Tỉnh/Thành: {opt['text']}")
                        break
            except Exception as e:
                print(f"Không thể chọn Tỉnh/Thành: {e}")
                
        # 7. Điền Số điện thoại
        if data.get("so_dien_thoai"):
            print(f"Điền SĐT: {data['so_dien_thoai']}")
            await page.fill("#ctl00_cplhContainer_txtPhone", data["so_dien_thoai"])
            
        # 8. Điền Email & Nhập lại Email
        if data.get("email"):
            print(f"Điền Email: {data['email']}")
            await page.fill("#ctl00_cplhContainer_txtUserEmail", data["email"])
            await page.fill("#ctl00_cplhContainer_txtUserEmailRetype", data["email"])
            
        # 9. Điền Mật khẩu (nếu có)
        if data.get("mat_khau"):
            print("Điền Mật khẩu...")
            await page.fill("#ctl00_cplhContainer_txtUserPassword", data["mat_khau"])
            await page.fill("#ctl00_cplhContainer_txtUserPasswordRetype", data["mat_khau"])
            
        # 10. Đính kèm File CCCD (nếu có đường dẫn)
        if data.get("file_cccd"):
            try:
                await page.set_input_files("#ctl00_cplhContainer_fuLicenseFileLink", data["file_cccd"])
                print("Đã tải file CCCD lên!")
            except Exception as e:
                print(f"Lỗi đính kèm file: {e}")
                
        print("\n=== HOÀN TẤT ĐIỀN FORM ===")
        print("Trình duyệt đang được giữ mở để bạn kiểm tra, chỉnh sửa hoặc bổ sung trực tiếp.")
        print("Khi xong, bạn có thể tự bấm nút 'Đăng ký' trên trang web.")
        
        # Giữ trình duyệt mở để người dùng xem và tương tác
        while True:
            if page.is_closed():
                break
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(run_fill())
