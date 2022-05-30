import base64
import qrcode
import cv2
import os

# found through trial end error
MAXIMUM_QR_DATA_LENGTH_BYTES = 2331 # for qrcode package
MAXIMUM_DECODABLE_QR_DATA_LENGTH_BYTES = 203 # for cv2 QR decoder package

data = base64.encodebytes(os.urandom(203))
print(f"Data:\n{data.decode()}")

img = qrcode.make(data)
img.save('qr_code.png')

img = cv2.imread('qr_code.png')
detector = cv2.QRCodeDetector()

detected_data, bbox, straight_qrcode = detector.detectAndDecode(img)

# if there is a QR code
if bbox is not None:
    print(f"QR decoded:\n{detected_data}")
#     # display the image with lines
#     # length of bounding box
#     n_lines = len(bbox)
#     for i in range(n_lines):
#         # draw all lines
#         point1 = tuple(bbox[i][0])
#         point2 = tuple(bbox[(i+1) % n_lines][0])
#         cv2.line(img, point1, point2, color=(255, 0, 0), thickness=2)


# cv2.imshow("img", img)
# cv2.waitKey(0)
# cv2.destroyAllWindows()

# with open('original_data.dat', 'wb') as fd:
#     fd.write(data)
    
# with open('detected_data.dat', 'w') as fd:
#     fd.write(detected_data)
    
assert(data.decode() == detected_data)
print("Successfully and accurately read QR code.")
