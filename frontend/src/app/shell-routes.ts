export type ShellPage = {
  path: string
  title: string
  description: string
}

export const passengerPages: readonly ShellPage[] = [
  {
    path: '/passenger/dashboard',
    title: 'Home',
    description: 'Your next departure, seat, booking reference, and status will appear here.',
  },
  {
    path: '/passenger/search',
    title: 'Search trips',
    description: 'Choose an origin, destination, and travel date to see scheduled trips.',
  },
  {
    path: '/passenger/trips/:tripId',
    title: 'Trip',
    description: 'Route, departure, arrival, fare, bus, and stops for the selected trip.',
  },
  {
    path: '/passenger/trips/:tripId/seats',
    title: 'Select a seat',
    description: 'Available seats can be selected. Booked and held seats stay unavailable.',
  },
  {
    path: '/passenger/bookings',
    title: 'My bookings',
    description: 'Booking reference, route, seat, amount, and payment status.',
  },
  {
    path: '/passenger/bookings/:bookingId',
    title: 'Booking',
    description: 'Details for one booking, including tracking and cancellation when the service allows it.',
  },
  {
    path: '/passenger/bookings/:bookingId/tracking',
    title: 'Live tracking',
    description: 'Bus position, next stop, and connection status. A missing location stays unavailable.',
  },
  {
    path: '/passenger/assistant',
    title: 'AI Assistant',
    description: 'Ask about trips, booking status, live location, and travel policy.',
  },
  {
    path: '/passenger/profile',
    title: 'Profile',
    description: 'Account details for the signed-in passenger.',
  },
]

export const driverPages: readonly ShellPage[] = [
  {
    path: '/driver/dashboard',
    title: 'Dashboard',
    description: 'Trips assigned to you, with route, departure, bus, and status.',
  },
  {
    path: '/driver/trips',
    title: 'My trips',
    description: 'Every trip assigned to the signed-in driver.',
  },
  {
    path: '/driver/trips/:tripId',
    title: 'Trip',
    description: 'Schedule and route for an assigned trip.',
  },
  {
    path: '/driver/trips/:tripId/active',
    title: 'Active trip',
    description: 'Start the trip, send location from this device, and finish when the service allows it.',
  },
  {
    path: '/driver/profile',
    title: 'Profile',
    description: 'Account details for the signed-in driver.',
  },
]

export const adminPages: readonly ShellPage[] = [
  {
    path: '/admin',
    title: 'Overview',
    description: 'Revenue, bookings, seats sold, active buses, and trips scheduled for today.',
  },
  {
    path: '/admin/fleet',
    title: 'Fleet',
    description: 'Registration, capacity, and status for every bus.',
  },
  {
    path: '/admin/fleet/:busId',
    title: 'Bus',
    description: 'Display name, capacity, and status for one bus.',
  },
  {
    path: '/admin/routes',
    title: 'Routes',
    description: 'Origin, destination, distance, duration, and whether the route is active.',
  },
  {
    path: '/admin/routes/:routeId',
    title: 'Route',
    description: 'Route details and stops in sequence, with coordinates when the service provides them.',
  },
  {
    path: '/admin/trips',
    title: 'Trips',
    description: 'Scheduled trips with route, bus, driver, and status.',
  },
  {
    path: '/admin/trips/:tripId',
    title: 'Trip',
    description: 'Schedule, bus, driver, and fare for one trip.',
  },
  {
    path: '/admin/trips/:tripId/manifest',
    title: 'Manifest',
    description: 'Passengers, seats, occupancy, and fare for one trip.',
  },
  {
    path: '/admin/bookings',
    title: 'Bookings',
    description: 'Booking references, passengers, seats, and payment status.',
  },
  {
    path: '/admin/bookings/:bookingId',
    title: 'Booking',
    description: 'One booking, including status and payment.',
  },
  {
    path: '/admin/live-tracking',
    title: 'Live tracking',
    description: 'Buses currently running, with position and next stop when a location exists.',
  },
  {
    path: '/admin/revenue',
    title: 'Revenue',
    description: 'Gross, refunded, and net revenue, plus bookings and seats sold.',
  },
  {
    path: '/admin/assistant',
    title: 'AI Assistant',
    description: 'Questions answered from policy, bookings, trips, and live location.',
  },
  {
    path: '/admin/profile',
    title: 'Profile',
    description: 'Account details for the signed-in administrator.',
  },
]
