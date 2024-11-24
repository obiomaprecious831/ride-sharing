# Decentralized Ride-Sharing Platform Smart Contract

## Overview
This smart contract implements a decentralized ride-sharing platform that connects drivers and passengers directly through blockchain technology. The system enables user registration, ride management, fare calculations, and a rating system, all managed through cryptocurrency (STX) transactions.

## Key Features
- Driver and passenger registration
- Ride request and acceptance system
- Dynamic fare calculation with carpooling support
- Driver rating system
- Automated payment processing with platform fees
- Transparent fare structure

## Smart Contract Functions

### Registration
- `register-driver`: Register as a driver with name and vehicle information
- `register-passenger`: Register as a passenger with name

### Ride Management
- `request-ride`: Create a new ride request with location details and preferences
- `accept-ride`: Allow drivers to accept available rides
- `complete-ride`: Mark rides as completed and process payments
- `rate-driver`: Enable passengers to rate their drivers

### Administrative Functions
- `set-platform-fee`: Update platform commission percentage
- `set-base-fare`: Modify base fare amount
- `set-per-km-fare`: Adjust per-kilometer fare rate

### Read-Only Functions
- `get-driver`: Retrieve driver information
- `get-passenger`: Retrieve passenger information
- `get-ride`: Get ride details
- `get-driver-rating`: Calculate driver's average rating
- `get-platform-fee`: View current platform fee
- `get-base-fare`: View current base fare
- `get-per-km-fare`: View current per-kilometer fare

## Data Structures

### Driver
```clarity
{
  name: (string-utf8 50),
  vehicle: (string-utf8 50),
  total-rides: uint,
  total-rating: uint,
  is-active: bool
}
```

### Passenger
```clarity
{
  name: (string-utf8 50),
  total-rides: uint
}
```

### Ride
```clarity
{
  passenger: principal,
  driver: (optional principal),
  start-location: (string-utf8 100),
  end-location: (string-utf8 100),
  distance: uint,
  fare: uint,
  status: (string-ascii 20),
  is-carpool: bool,
  seats: uint
}
```

## Fare Calculation
The fare is calculated using the following formula:
```
Base Fare + (Distance × Per-km Fare)

For carpools:
(Base Fare + Distance × Per-km Fare) × seats ÷ 2
```

Default values:
- Base Fare: 0.5 STX
- Per-km Fare: 0.1 STX
- Platform Fee: 5%

## Error Codes
- `err-owner-only (u100)`: Operation restricted to contract owner
- `err-not-found (u101)`: Requested resource not found
- `err-unauthorized (u102)`: Unauthorized access attempt
- `err-already-registered (u103)`: User already registered
- `err-ride-not-available (u104)`: Ride unavailable or invalid status
- `err-insufficient-funds (u105)`: Insufficient funds for transaction
- `err-invalid-rating (u106)`: Invalid rating value
- `err-transfer-failed (u107)`: STX transfer failed

## Usage Examples

1. Register as a driver:
```clarity
(contract-call? .ride-sharing register-driver "John Doe" "Toyota Camry 2022")
```

2. Register as a passenger:
```clarity
(contract-call? .ride-sharing register-passenger "Jane Smith")
```

3. Request a ride:
```clarity
(contract-call? .ride-sharing request-ride "123 Main St" "456 Park Ave" u10 false u1)
```

4. Accept a ride (as driver):
```clarity
(contract-call? .ride-sharing accept-ride u1)
```

## Implementation Notes

- Rides have multiple status states: "requested", "accepted", "completed"
- Carpool rides offer reduced per-person fares
- Platform fees are automatically deducted and transferred to contract owner
- Driver ratings are maintained as a cumulative score with total rides
- All monetary values are in microSTX (1 STX = 1,000,000 microSTX)

## Security Features

1. Role-based access control for drivers and passengers
2. Automated payment processing through smart contract
3. Status validations for ride operations
4. Owner-only administrative functions
5. Built-in rate limiting through blockchain transactions

## Integration Guidelines

### Web3 Integration
The platform can be integrated with:
- Web3 wallets supporting STX
- Ride-sharing mobile applications
- Maps and navigation services
- Real-time location tracking systems

### Smart Contract Interaction
- Use Stacks wallet for authentication
- Ensure sufficient STX balance for rides
- Monitor transaction status for payment confirmation
- Handle error cases appropriately

## Platform Economics

- Dynamic pricing based on distance
- Carpool discounts to promote shared rides
- Transparent fee structure
- Automatic payment distribution
- Platform sustainability through commission fees

## Future Enhancements
1. Implement surge pricing
2. Add support for scheduled rides
3. Introduce driver preferences and filters
4. Implement dispute resolution mechanism
5. Add support for different vehicle categories
