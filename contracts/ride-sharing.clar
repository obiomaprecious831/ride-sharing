;; Decentralized Ride-Sharing Platform

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-already-registered (err u103))
(define-constant err-ride-not-available (err u104))
(define-constant err-insufficient-funds (err u105))
(define-constant err-invalid-rating (err u106))
(define-constant err-transfer-failed (err u107))

;; Data variables
(define-data-var next-ride-id uint u0)
(define-data-var platform-fee uint u50) ;; 5% fee (1000 = 100%)
(define-data-var base-fare uint u500000) ;; 0.5 STX
(define-data-var per-km-fare uint u100000) ;; 0.1 STX per km

;; Data maps
(define-map drivers
  { driver-id: principal }
  {
    name: (string-utf8 50),
    vehicle: (string-utf8 50),
    total-rides: uint,
    total-rating: uint,
    is-active: bool
  }
)

(define-map passengers
  { passenger-id: principal }
  {
    name: (string-utf8 50),
    total-rides: uint
  }
)

(define-map rides
  { ride-id: uint }
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
)

;; Private functions
(define-private (is-owner)
  (is-eq tx-sender contract-owner)
)

(define-private (calculate-platform-fee (fare uint))
  (/ (* fare (var-get platform-fee)) u1000)
)

(define-private (calculate-fare (distance uint) (is-carpool bool) (seats uint))
  (let
    (
      (base (var-get base-fare))
      (per-km (var-get per-km-fare))
      (distance-fare (* distance per-km))
      (total-fare (+ base distance-fare))
    )
    (if is-carpool
      (/ (* total-fare seats) u2)
      total-fare
    )
  )
)

;; Public functions
(define-public (register-driver (name (string-utf8 50)) (vehicle (string-utf8 50)))
  (let
    ((driver-id tx-sender))
    (asserts! (is-none (map-get? drivers {driver-id: driver-id})) (err err-already-registered))
    (ok (map-set drivers
      {driver-id: driver-id}
      {
        name: name,
        vehicle: vehicle,
        total-rides: u0,
        total-rating: u0,
        is-active: true
      }
    ))
  )
)

(define-public (register-passenger (name (string-utf8 50)))
  (let
    ((passenger-id tx-sender))
    (asserts! (is-none (map-get? passengers {passenger-id: passenger-id})) (err err-already-registered))
    (ok (map-set passengers
      {passenger-id: passenger-id}
      {
        name: name,
        total-rides: u0
      }
    ))
  )
)

(define-public (request-ride (start-location (string-utf8 100)) (end-location (string-utf8 100)) (distance uint) (is-carpool bool) (seats uint))
  (let
    (
      (ride-id (var-get next-ride-id))
      (fare (calculate-fare distance is-carpool seats))
    )
    (asserts! (is-some (map-get? passengers {passenger-id: tx-sender})) (err err-unauthorized))
    (map-set rides
      {ride-id: ride-id}
      {
        passenger: tx-sender,
        driver: none,
        start-location: start-location,
        end-location: end-location,
        distance: distance,
        fare: fare,
        status: "requested",
        is-carpool: is-carpool,
        seats: seats
      }
    )
    (var-set next-ride-id (+ ride-id u1))
    (ok ride-id)
  )
)

(define-public (accept-ride (ride-id uint))
  (let
    (
      (ride (unwrap! (map-get? rides {ride-id: ride-id}) (err err-not-found)))
      (driver-id tx-sender)
    )
    (asserts! (is-some (map-get? drivers {driver-id: driver-id})) (err err-unauthorized))
    (asserts! (is-eq (get status ride) "requested") (err err-ride-not-available))
    (ok (map-set rides
      {ride-id: ride-id}
      (merge ride {
        driver: (some driver-id),
        status: "accepted"
      })
    ))
  )
)

(define-public (complete-ride (ride-id uint))
  (let
    (
      (ride (unwrap! (map-get? rides {ride-id: ride-id}) (err err-not-found)))
      (driver-id (unwrap! (get driver ride) (err err-unauthorized)))
      (passenger-id (get passenger ride))
      (fare (get fare ride))
      (platform-fee-amount (calculate-platform-fee fare))
    )
    (asserts! (is-eq tx-sender driver-id) (err err-unauthorized))
    (asserts! (is-eq (get status ride) "accepted") (err err-ride-not-available))
    (match (stx-transfer? fare passenger-id driver-id)
      success (match (stx-transfer? platform-fee-amount driver-id contract-owner)
                fee-success (begin
                  (map-set rides
                    {ride-id: ride-id}
                    (merge ride {status: "completed"})
                  )
                  (ok true)
                )
                fee-error (err err-transfer-failed))
      error (err err-insufficient-funds))
  )
)



(define-public (rate-driver (ride-id uint) (rating uint))
  (let
    (
      (ride (unwrap! (map-get? rides {ride-id: ride-id}) (err err-not-found)))
      (driver-id (unwrap! (get driver ride) (err err-unauthorized)))
      (passenger-id (get passenger ride))
    )
    (asserts! (is-eq tx-sender passenger-id) (err err-unauthorized))
    (asserts! (is-eq (get status ride) "completed") (err err-ride-not-available))
    (asserts! (and (>= rating u1) (<= rating u5)) (err err-invalid-rating))
    (match (map-get? drivers {driver-id: driver-id})
      driver (ok (map-set drivers
                  {driver-id: driver-id}
                  (merge driver {
                    total-rides: (+ (get total-rides driver) u1),
                    total-rating: (+ (get total-rating driver) rating)
                  })))
      (err err-not-found)
    )
  )
)

(define-public (set-platform-fee (new-platform-fee uint))
  (begin
    (asserts! (is-owner) (err err-owner-only))
    (asserts! (<= new-platform-fee u1000) (err err-invalid-rating))
    (ok (var-set platform-fee new-platform-fee))
  )
)

(define-public (set-base-fare (new-base-fare uint))
  (begin
    (asserts! (is-owner) (err err-owner-only))
    (ok (var-set base-fare new-base-fare))
  )
)

(define-public (set-per-km-fare (new-per-km-fare uint))
  (begin
    (asserts! (is-owner) (err err-owner-only))
    (ok (var-set per-km-fare new-per-km-fare))
  )
)

;; Read-only functions
(define-read-only (get-driver (driver-id principal))
  (ok (map-get? drivers {driver-id: driver-id}))
)

(define-read-only (get-passenger (passenger-id principal))
  (ok (map-get? passengers {passenger-id: passenger-id}))
)

(define-read-only (get-ride (ride-id uint))
  (ok (map-get? rides {ride-id: ride-id}))
)

(define-read-only (get-platform-fee)
  (ok (var-get platform-fee))
)

(define-read-only (get-base-fare)
  (ok (var-get base-fare))
)

(define-read-only (get-per-km-fare)
  (ok (var-get per-km-fare))
)

(define-read-only (get-driver-rating (driver-id principal))
  (match (map-get? drivers {driver-id: driver-id})
    driver (let
      ((total-rides (get total-rides driver))
       (total-rating (get total-rating driver)))
      (if (> total-rides u0)
        (ok (/ total-rating total-rides))
        (ok u0)))
    (err err-not-found)
  )
)
