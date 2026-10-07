import asyncio
import os
from PIL import Image
from playwright.async_api import async_playwright

PUBLIC_DIR = r"d:\MyProject\AI-Translate-Meeting\apps\web\public"
SVG_PATH = os.path.join(PUBLIC_DIR, "layameet-icon.svg")

SIZES = [
    ("layameet-icon.png", 512),
    ("layameet-icon-192.png", 192),
    ("apple-touch-icon.png", 180),
    ("favicon-96x96.png", 96),
    ("favicon-48x48.png", 48),
    ("favicon-32x32.png", 32),
    ("favicon-16x16.png", 16),
]

async def rasterize_svg():
    with open(SVG_PATH, "r", encoding="utf-8") as f:
        svg_content = f.read()

    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            html, body {{
                margin: 0;
                padding: 0;
                background: transparent;
                width: 100%;
                height: 100%;
                overflow: hidden;
            }}
            svg {{
                width: 100%;
                height: 100%;
                display: block;
            }}
        </style>
    </head>
    <body>
        {svg_content}
    </body>
    </html>
    """

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for filename, size in SIZES:
            context = await browser.new_context(
                viewport={"width": size, "height": size},
                device_scale_factor=1
            )
            page = await context.new_page()
            await page.set_content(html_template)
            out_path = os.path.join(PUBLIC_DIR, filename)
            await page.screenshot(path=out_path, omit_background=True)
            print(f"Generated {filename} ({size}x{size})")
            await context.close()
        await browser.close()

def generate_ico():
    img_48 = Image.open(os.path.join(PUBLIC_DIR, "favicon-48x48.png"))
    img_32 = Image.open(os.path.join(PUBLIC_DIR, "favicon-32x32.png"))
    img_16 = Image.open(os.path.join(PUBLIC_DIR, "favicon-16x16.png"))

    ico_path = os.path.join(PUBLIC_DIR, "favicon.ico")
    img_48.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[img_32, img_16]
    )
    print("Generated favicon.ico with 16, 32, 48 multi-res icons")

    # Clean up temporary small pngs
    for temp_file in ["favicon-32x32.png", "favicon-16x16.png"]:
        p = os.path.join(PUBLIC_DIR, temp_file)
        if os.path.exists(p):
            os.remove(p)

if __name__ == "__main__":
    asyncio.run(rasterize_svg())
    generate_ico()
    print("All favicon assets generated successfully!")
