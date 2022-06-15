import requests
import base64
import json

from Crypto.Signature import pkcs1_15
from Crypto.PublicKey import RSA
import Crypto.Hash
import numpy as np
from PIL import Image
import pyzbar.pyzbar as pyzbar
import qrcode
import cv2

from ballot import Ballot


class VotingMachine:
    MACHINE_KEYS_DIR = "./keys"
    HE_KEYS_DIR = f"{MACHINE_KEYS_DIR}/he"

    def __init__(self) -> None:
        # TODO(@petru): add logger

        with open(f"{self.MACHINE_KEYS_DIR}/machine_key.pub") as fd:
            self.public_key = RSA.import_key(fd.read())
        with open(f"{self.MACHINE_KEYS_DIR}/machine_key") as fd:
            self.private_key = RSA.import_key(fd.read())

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
                assert len(
                    data) == 2, "data should contain exactly the signature and certificate of voter"
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
        # Deprecated.
        cap = cv2.VideoCapture(0)
        print("[WEBCAM] Scanning for QR code...")
        while True:
            ret, frame = cap.read()
            data = VotingMachine.decoder(frame, frame)
            cv2.imshow('Image', frame)

            code = cv2.waitKey(10)
            if code == ord('q'):
                break

    def encode_vote(self, vote_id: int):
        arr = list()
        for id in range(Ballot.get_count()):
            if id == vote_id:
                arr.append(1)
            else:
                arr.append(0)

        data = json.dumps(arr)
        print("Sending vote for encryption process...")
        print(f"Data: {data}")
        res = requests.get("http://localhost:3000/encrypt-vote", json={'vote': data})
        print("Encrypted!")

        encrypted_vote = res.content

        # ciphertext = self.HE.encrypt(arr)
        # encrypted_vote = ciphertext.to_bytes()  # (compr_mode='zlib')

        print(f"[HE] Encrypted vote size: {len(encrypted_vote)} bytes")

        signer = pkcs1_15.new(self.private_key)
        hash_object = Crypto.Hash.SHA512.new(data=encrypted_vote)
        signature = signer.sign(hash_object)
        vote_digest = hash_object.digest()

        return encrypted_vote, signature, vote_digest

    @staticmethod
    def is_vote_valid(encrypted_vote: bytes, voter_signature: bytes, voter_certificate: bytes):
        # print("[VOTER SIGNATURE] MD5:", md5(voter_signature).hexdigest())
        # print("[VOTER CERTIFICATE] MD5:", md5(voter_certificate).hexdigest())

        public_key = RSA.import_key(voter_certificate)
        try:
            vote_digest = Crypto.Hash.SHA512.new(encrypted_vote).digest()
            pkcs1_15.new(public_key).verify(
                Crypto.Hash.SHA256.new(vote_digest), voter_signature)
            print("[VOTER SIGNATURE] Signature is valid!")
            return True
        except ValueError:
            print("[VOTER SIGNATURE] Is INVALID!")
            return False

    def vote(self, encrypted_vote: bytes, machine_signature: bytes, voter_signature: bytes, voter_certificate: bytes):
        data = {
            'vote': encrypted_vote,
            'machine_signature': machine_signature,
            'voter_signature': voter_signature,
            'voter_certificate': voter_certificate # could be skipped
        }
        res = requests.get("http://localhost:3000/encrypt-vote", json=data)

        # TODO: add interfaces for success/fail cases

        if res.status_code == 200:
            print("[VOTE] Voted.")
        else:
            print("[VOTE] Vote failed.")


if __name__ == "__main__":
    res = requests.get("http://localhost:3000/encrypt-vote", json={'vote': json.dumps([5, 0, 2])})
    vote_a = res.content
    
    res = requests.get("http://localhost:3000/encrypt-vote", json={'vote': json.dumps([2, 3, 2_000_000_000])})
    vote_b = res.content

    print("Sending vote for testing...")
    res = requests.get("http://localhost:3000/test-add", json={'vote_a': vote_a.decode('utf-8'), 'vote_b': vote_b.decode('utf-8')})
    print("Done!")

    obj = json.loads(json.loads(res.content))
    # print(obj)
    result = {id: obj[id] for id in obj if obj[id] != 0}
    print(json.dumps(result, indent=4))

    # vm = VotingMachine()

    # img = Image.open('qr_code.png')
    # data = VotingMachine.decoder(img)
