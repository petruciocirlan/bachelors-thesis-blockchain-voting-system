# TODOs

## Client

### Mobile Application

    - Backend
        - [DONE] Create private/public key pair for user
    - Frontend
        - [DONE] Scan QR code
        - [DONE] Sign message
        - [DONE] Display QR code
        - [    ] Option to remember tx id

## Interaction

### Voting machine

    - [DONE] Voting ballot
    - [DONE] Encrypt choices
    - [DONE] Create QR code
    - [DONE] Use webcam to scan for QR code
    - [DONE] Validate scanned QR code (?)
    - [    ] Create transaction
    - [    ] Send transaction to blockchain

### Web Application (optional)

    - [    ] Setup server
    - [    ] Frontend
    - [    ] Integrate voting machine logic

## Blockchain

    - [DONE] Configure blockchain for testing
    - [DONE] Create smart contract for receiving vote transactions
        - [DONE] Add vote to homomorphically encrypted tally
        - [DONE] If voting session ended, enable return of tally
    - [DONE] Test
    - [    ] Configure blockchain for production

## Maybe later

    - Option to export private/public key pair
    - Non-Interactive Zero Knowledge proof (NIZK)
        - Check NIZK
