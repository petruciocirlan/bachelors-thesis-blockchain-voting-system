# import qrcode
import pyzbar.pyzbar as pyzbar
import numpy as np
import qrcode
import cv2


class VotingMachine:
    def __init__(self) -> None:
        # TODO(@petru): add logger
        self.nonce = 0

    @staticmethod
    def generate_qr_code(data: bytes):
        return qrcode.make(data)

    @staticmethod
    def decoder(image, frame):
        gray_img = cv2.cvtColor(image, 0)
        barcode = pyzbar.decode(gray_img)

        for obj in barcode:
            points = obj.polygon
            (x, y, w, h) = obj.rect
            pts = np.array(points, np.int32)
            pts = pts.reshape((-1, 1, 2))
            cv2.polylines(image, [pts], True, (0, 255, 0), 3)

            barcodeData = obj.data.decode("utf-8")
            barcodeType = obj.type
            string = "Data " + str(barcodeData) + " | Type " + str(barcodeType)

            cv2.putText(frame, string, (x, y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)
            print("[WEBCAM] Barcode: "+barcodeData + " | Type: "+barcodeType)
            return barcodeData

    @staticmethod
    def scan_qr_code():
        cap = cv2.VideoCapture(0)
        print("[WEBCAM] Scanning for QR code...")
        while True:
            ret, frame = cap.read()
            data = VotingMachine.decoder(frame, frame)
            cv2.imshow('Image', frame)

            # TODO(@petru): validate and sign data (transaction)

            code = cv2.waitKey(10)
            if code == ord('q'):
                break

    def encode_vote(self, data):
        # TODO(petru): encrypt vote
        return data


if __name__ == "__main__":
    VotingMachine.scan_qr_code()
