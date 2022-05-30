import qrcode

def generate_qr_code(data: bytes):
    return qrcode.make(data)

