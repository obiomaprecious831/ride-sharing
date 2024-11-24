import { describe, it, expect, beforeEach } from 'vitest';

// Mock contract state
let nextRideId = 0;
let platformFee = 50; // 5%
let baseFare = 500000; // 0.5 STX
let perKmFare = 100000; // 0.1 STX per km
let drivers = {};
let passengers = {};
let rides = {};

// Mock contract owner
const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';

// Helper function to reset state before each test
function resetState() {
  nextRideId = 0;
  platformFee = 50;
  baseFare = 500000;
  perKmFare = 100000;
  drivers = {};
  passengers = {};
  rides = {};
}

// Mock contract functions
function registerDriver(sender, name, vehicle) {
  if (drivers[sender]) {
    return { type: 'err', value: 103 }; // err-already-registered
  }
  drivers[sender] = {
    name,
    vehicle,
    totalRides: 0,
    totalRating: 0,
    isActive: true
  };
  return { type: 'ok', value: true };
}

function registerPassenger(sender, name) {
  if (passengers[sender]) {
    return { type: 'err', value: 103 }; // err-already-registered
  }
  passengers[sender] = {
    name,
    totalRides: 0
  };
  return { type: 'ok', value: true };
}

function requestRide(sender, startLocation, endLocation, distance, isCarpool, seats) {
  if (!passengers[sender]) {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  const rideId = nextRideId++;
  const fare = calculateFare(distance, isCarpool, seats);
  rides[rideId] = {
    passenger: sender,
    driver: null,
    startLocation,
    endLocation,
    distance,
    fare,
    status: 'requested',
    isCarpool,
    seats
  };
  return { type: 'ok', value: rideId };
}

function acceptRide(sender, rideId) {
  if (!drivers[sender]) {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  if (!rides[rideId] || rides[rideId].status !== 'requested') {
    return { type: 'err', value: 104 }; // err-ride-not-available
  }
  rides[rideId].driver = sender;
  rides[rideId].status = 'accepted';
  return { type: 'ok', value: true };
}

function completeRide(sender, rideId) {
  if (!rides[rideId] || rides[rideId].driver !== sender || rides[rideId].status !== 'accepted') {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  rides[rideId].status = 'completed';
  return { type: 'ok', value: true };
}

function rateDriver(sender, rideId, rating) {
  if (!rides[rideId] || rides[rideId].passenger !== sender || rides[rideId].status !== 'completed') {
    return { type: 'err', value: 102 }; // err-unauthorized
  }
  if (rating < 1 || rating > 5) {
    return { type: 'err', value: 106 }; // err-invalid-rating
  }
  const driver = rides[rideId].driver;
  drivers[driver].totalRides++;
  drivers[driver].totalRating += rating;
  return { type: 'ok', value: true };
}

function calculateFare(distance, isCarpool, seats) {
  const distanceFare = distance * perKmFare;
  const totalFare = baseFare + distanceFare;
  return isCarpool ? Math.floor((totalFare * seats) / 2) : totalFare;
}

function setPlatformFee(sender, newPlatformFee) {
  if (sender !== contractOwner) {
    return { type: 'err', value: 100 }; // err-owner-only
  }
  if (newPlatformFee > 1000) {
    return { type: 'err', value: 106 }; // err-invalid-rating
  }
  platformFee = newPlatformFee;
  return { type: 'ok', value: true };
}

// Tests
describe('Decentralized Ride-Sharing Platform', () => {
  beforeEach(() => {
    resetState();
  });
  
  it('allows drivers and passengers to register', () => {
    const driver = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
    const passenger = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    expect(registerDriver(driver, 'John Doe', 'Toyota Camry')).toEqual({ type: 'ok', value: true });
    expect(registerPassenger(passenger, 'Jane Smith')).toEqual({ type: 'ok', value: true });
    
    expect(drivers[driver].name).toBe('John Doe');
    expect(passengers[passenger].name).toBe('Jane Smith');
  });
  
  it('allows passengers to request rides', () => {
    const passenger = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    registerPassenger(passenger, 'Jane Smith');
    
    const result = requestRide(passenger, 'A St', 'B St', 10, false, 1);
    expect(result.type).toBe('ok');
    expect(typeof result.value).toBe('number');
    
    const rideId = result.value;
    expect(rides[rideId].passenger).toBe(passenger);
    expect(rides[rideId].status).toBe('requested');
  });
  
  it('allows drivers to accept rides', () => {
    const driver = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
    const passenger = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    registerDriver(driver, 'John Doe', 'Toyota Camry');
    registerPassenger(passenger, 'Jane Smith');
    const rideId = requestRide(passenger, 'A St', 'B St', 10, false, 1).value;
    
    expect(acceptRide(driver, rideId)).toEqual({ type: 'ok', value: true });
    expect(rides[rideId].driver).toBe(driver);
    expect(rides[rideId].status).toBe('accepted');
  });
  
  it('allows drivers to complete rides', () => {
    const driver = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
    const passenger = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    registerDriver(driver, 'John Doe', 'Toyota Camry');
    registerPassenger(passenger, 'Jane Smith');
    const rideId = requestRide(passenger, 'A St', 'B St', 10, false, 1).value;
    acceptRide(driver, rideId);
    
    expect(completeRide(driver, rideId)).toEqual({ type: 'ok', value: true });
    expect(rides[rideId].status).toBe('completed');
  });
  
  it('allows passengers to rate drivers', () => {
    const driver = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
    const passenger = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    
    registerDriver(driver, 'John Doe', 'Toyota Camry');
    registerPassenger(passenger, 'Jane Smith');
    const rideId = requestRide(passenger, 'A St', 'B St', 10, false, 1).value;
    acceptRide(driver, rideId);
    completeRide(driver, rideId);
    
    expect(rateDriver(passenger, rideId, 5)).toEqual({ type: 'ok', value: true });
    expect(drivers[driver].totalRides).toBe(1);
    expect(drivers[driver].totalRating).toBe(5);
  });
  
  it('calculates correct fare for regular and carpool rides', () => {
    const passenger = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';
    registerPassenger(passenger, 'Jane Smith');
    
    const regularRideId = requestRide(passenger, 'A St', 'B St', 10, false, 1).value;
    const carpoolRideId = requestRide(passenger, 'A St', 'B St', 10, true, 2).value;
    
    const expectedRegularFare = baseFare + (10 * perKmFare);
    const expectedCarpoolFare = Math.floor((baseFare + (10 * perKmFare)) * 2 / 2);
    
    expect(rides[regularRideId].fare).toBe(expectedRegularFare);
    expect(rides[carpoolRideId].fare).toBe(expectedCarpoolFare);
  });
  
  it('allows the contract owner to set the platform fee', () => {
    const newPlatformFee = 30; // 3%
    
    const setFeeResult = setPlatformFee(contractOwner, newPlatformFee);
    expect(setFeeResult).toEqual({ type: 'ok', value: true });
    
    expect(platformFee).toBe(newPlatformFee);
  });
  
  it('prevents non-owners from setting the platform fee', () => {
    const nonOwner = 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5';
    const newPlatformFee = 30; // 3%
    
    const setFeeResult = setPlatformFee(nonOwner, newPlatformFee);
    expect(setFeeResult).toEqual({ type: 'err', value: 100 }); // err-owner-only
    
    expect(platformFee).toBe(50); // Unchanged
  });
});

