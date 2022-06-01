# TODOs


## Client

### Mobile Application
    - Backend
        - [    ] Create private/public key pair for user
    - Frontend
        - [    ] Display QR code
        - [    ] Option to export private/public key pair
        - [    ] Option to remember tx id


## Interaction


### Voting machine

    - [DONE] Voting ballot
    - [    ] Encrypt choices
    - [DONE] Create QR code
    - [DONE] Use webcam to scan for QR code
    - [    ] Validate scanned QR code
    - [    ] Create transaction
    - [    ] Send transaction to blockchain

### Web Application (optional)
    - [    ] Setup server
    - [    ] Frontend
    - [    ] Integrate voting machine logic


## Blockchain


    - [    ] Configure blockchain for testing
    - [    ] Create smart contract for receiving vote transactions
        - [    ] Check NZIK
        - [    ] Add vote to homomorphically encrypted tally
        - [    ] If voting session ended, enable return of tally
    - [    ] Test
    - [    ] Configure blockchain for production


## Maybe later

    - Non-Interactive Zero Knowledge proof (NIZK)
    - Check NIZK