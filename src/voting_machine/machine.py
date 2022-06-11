import base64
from hashlib import md5
import hashlib

from Crypto.Signature import pkcs1_15
from Crypto.PublicKey import RSA
import Crypto.Hash
from Pyfhel import Pyfhel, PyCtxt
import numpy as np
from PIL import Image
import pyzbar.pyzbar as pyzbar
import qrcode
import cv2

from ballot import Ballot


class VotingMachine:
    def __init__(self) -> None:
        # TODO(@petru): add logger

        self.nonce = 0
        self.HE = Pyfhel(
            context_params={'scheme': 'bfv', 'n': 2**14, 't_bits': 24, 'sec': 256})

        with open("machine_key.pub") as fd:
            self.public_key = RSA.import_key(fd.read())
        with open("machine_key") as fd:
            self.private_key = RSA.import_key(fd.read())

        keys_dir_name = "keys"

        with open(f"{keys_dir_name}/pub.key", "rb") as fd:
            self.HE.from_bytes_public_key(base64.b64decode(fd.read()))
        with open(f"{keys_dir_name}/relin.key", "rb") as fd:
            self.HE.from_bytes_relin_key(base64.b64decode(fd.read()))
        # with open(f"{keys_dir_name}/sec.key", "rb") as fd:
        #     self.HE.from_bytes_secret_key(base64.b64decode(fd.read()))

        # Save & restore everything into/from files
        # ---------------------------

        # self.HE.keyGen()
        # self.HE.rotateKeyGen()
        # self.HE.relinKeyGen()

        # with open(f"{keys_dir_name}/pub.key", "wb") as fd:
        #     fd.write(base64.b64encode(self.HE.to_bytes_public_key()))
        # with open(f"{keys_dir_name}/sec.key", "wb") as fd:
        #     fd.write(base64.b64encode(self.HE.to_bytes_secret_key()))
        # with open(f"{keys_dir_name}/relin.key", "wb") as fd:
        #     fd.write(base64.b64encode(self.HE.to_bytes_relin_key()))

        # Then we encrypt some data
        # c = HE.encrypt(np.array([42]))
        # p = HE.encode(np.array([-1]))

        # print("1. Creating serializable objects")
        # print(f"  Pyfhel object HE: {HE}")
        # print(f"  PyCtxt c=HE.encrypt([42]): {c}")
        # print(f"  PyPtxt p=HE.encode([-1]): {p}")

    @staticmethod
    def generate_qr_code(data: bytes):
        return qrcode.make(data)

    @staticmethod
    def decoder(image, frame=None):
        # print(image)
        if isinstance(image, Image.Image):
            barcode = pyzbar.decode(image)
        else:
            gray_img = cv2.cvtColor(image, 0)
            barcode = pyzbar.decode(gray_img)

        for obj in barcode:
            barcodeData = obj.data.decode("utf-8")
            barcodeType = obj.type
            # string = "Data " + str(barcodeData) + " | Type " + str(barcodeType)
            # print(barcodeData)
            data = [x.strip() for x in barcodeData.split('|')]
            # print(data)

            try:
                assert len(data) == 2, "data should contain exactly the signature and certificate of voter"
                voter_signature = base64.b64decode(data[0])
                voter_certificate = base64.b64decode(data[1])

                is_valid = True
                string = "DETECTED!"
                color = (0, 255, 0)
            except:
                is_valid = False
                string = "INVALID!"
                color = (0, 0, 255)

            if frame is not None:
                points = obj.polygon
                (x, y, w, h) = obj.rect
                pts = np.array(points, np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv2.polylines(image, [pts], True, color, 3)
                cv2.putText(frame, string, (x+50, y-5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                # print("[WEBCAM] Barcode: "+barcodeData +
                #       " | Type: "+barcodeType)

            if is_valid:
                return voter_signature, voter_certificate
            else:
                return None, None
        return None, None

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

    def encode_vote(self, vote_id : int):
        arr = np.zeros(Ballot.get_count())
        arr[vote_id] = 1
        # arr = np.array([1])

        ciphertext = self.HE.encrypt(arr)
        encrypted_vote = ciphertext.to_bytes() # (compr_mode='zlib')

        signer = pkcs1_15.new(self.private_key)
        hash_object = Crypto.Hash.SHA512.new(data=encrypted_vote)
        signature = signer.sign(hash_object)
        vote_digest = hash_object.digest()

        return encrypted_vote, signature, vote_digest

    def decode_vote(self, data):
        ciphertext = PyCtxt.from_bytes(data)
        plaintext = self.HE.decrypt(ciphertext)
        print(plaintext)

    @staticmethod
    def is_vote_valid(encrypted_vote : bytes, voter_signature : bytes, voter_certificate : bytes):
        # print("[VOTER SIGNATURE] MD5:", md5(voter_signature).hexdigest())
        # print("[VOTER CERTIFICATE] MD5:", md5(voter_certificate).hexdigest())

        public_key = RSA.import_key(voter_certificate)
        try:
            vote_digest = Crypto.Hash.SHA512.new(encrypted_vote).digest()
            pkcs1_15.new(public_key).verify(Crypto.Hash.SHA256.new(vote_digest), voter_signature)
            print("[VOTER SIGNATURE] Signature is valid!")
            return True
        except ValueError:
            print("[VOTER SIGNATURE] Is INVALID!")
            return False


    def vote(self, encrypted_vote : bytes, machine_signature : bytes, voter_signature : bytes, voter_certificate : bytes):
        print("[VOTE] Voted.")


if __name__ == "__main__":
    VotingMachine.scan_qr_code()

    # vm = VotingMachine()

    # img = Image.open('qr_code.png')
    # data = VotingMachine.decoder(img)
