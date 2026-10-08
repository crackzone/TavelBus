import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout.tsx'
import { DriverLayout } from '../layouts/DriverLayout.tsx'
import { PassengerLayout } from '../layouts/PassengerLayout.tsx'
import { PublicLayout } from '../layouts/PublicLayout.tsx'
import { GuestOnly, RequireAuth } from '../features/auth/RequireAuth.tsx'
import { RouteErrorPage } from '../pages/RouteErrorPage.tsx'
import { lazyPage } from './lazy-page.ts'
import { placeholderRoutes } from './placeholder-routes.tsx'
import { adminPages, driverPages, passengerPages } from './shell-routes.ts'

const HomeRoute = lazyPage(() => import('../pages/HomeRoute.tsx').then((module) => module.HomeRoute))
const LoginPage = lazyPage(() => import('../pages/LoginPage.tsx').then((module) => module.LoginPage))
const RegisterPage = lazyPage(() => import('../pages/RegisterPage.tsx').then((module) => module.RegisterPage))
const UnauthorizedPage = lazyPage(() => import('../pages/UnauthorizedPage.tsx').then((module) => module.UnauthorizedPage))
const ForbiddenPage = lazyPage(() => import('../pages/ForbiddenPage.tsx').then((module) => module.ForbiddenPage))
const NotFoundPage = lazyPage(() => import('../pages/NotFoundPage.tsx').then((module) => module.NotFoundPage))
const DashboardPage = lazyPage(() => import('../pages/passenger/DashboardPage.tsx').then((module) => module.DashboardPage))
const SearchPage = lazyPage(() => import('../pages/passenger/SearchPage.tsx').then((module) => module.SearchPage))
const TripPage = lazyPage(() => import('../pages/passenger/TripPage.tsx').then((module) => module.TripPage))
const SeatsPage = lazyPage(() => import('../pages/passenger/SeatsPage.tsx').then((module) => module.SeatsPage))
const BookingsPage = lazyPage(() => import('../pages/passenger/BookingsPage.tsx').then((module) => module.BookingsPage))
const BookingPage = lazyPage(() => import('../pages/passenger/BookingPage.tsx').then((module) => module.BookingPage))
const TrackingPage = lazyPage(() => import('../pages/passenger/TrackingPage.tsx').then((module) => module.TrackingPage))
const AssistantPage = lazyPage(() => import('../pages/assistant/AssistantPage.tsx').then((module) => module.AssistantPage))
const ProfilePage = lazyPage(() => import('../pages/profile/ProfilePage.tsx').then((module) => module.ProfilePage))
const DriverDashboardPage = lazyPage(() => import('../pages/driver/DashboardPage.tsx').then((module) => module.DashboardPage))
const TripsPage = lazyPage(() => import('../pages/driver/TripsPage.tsx').then((module) => module.TripsPage))
const DriverTripPage = lazyPage(() => import('../pages/driver/TripPage.tsx').then((module) => module.TripPage))
const ActiveTripPage = lazyPage(() => import('../pages/driver/ActiveTripPage.tsx').then((module) => module.ActiveTripPage))
const AdminDashboardPage = lazyPage(() => import('../pages/admin/DashboardPage.tsx').then((module) => module.DashboardPage))
const FleetPage = lazyPage(() => import('../pages/admin/FleetPage.tsx').then((module) => module.FleetPage))
const BusPage = lazyPage(() => import('../pages/admin/BusPage.tsx').then((module) => module.BusPage))
const RoutesPage = lazyPage(() => import('../pages/admin/RoutesPage.tsx').then((module) => module.RoutesPage))
const AdminRoutePage = lazyPage(() => import('../pages/admin/RoutePage.tsx').then((module) => module.RoutePage))
const AdminTripsPage = lazyPage(() => import('../pages/admin/TripsPage.tsx').then((module) => module.TripsPage))
const ManifestPage = lazyPage(() => import('../pages/admin/ManifestPage.tsx').then((module) => module.ManifestPage))
const AdminTripPage = lazyPage(() => import('../pages/admin/TripPage.tsx').then((module) => module.TripPage))
const AdminBookingsPage = lazyPage(() => import('../pages/admin/BookingsPage.tsx').then((module) => module.BookingsPage))
const AdminBookingPage = lazyPage(() => import('../pages/admin/BookingPage.tsx').then((module) => module.BookingPage))
const RevenuePage = lazyPage(() => import('../pages/admin/RevenuePage.tsx').then((module) => module.RevenuePage))
const LiveTrackingPage = lazyPage(() => import('../pages/admin/LiveTrackingPage.tsx').then((module) => module.LiveTrackingPage))

const adminImplemented = new Set([
  '/admin',
  '/admin/fleet',
  '/admin/fleet/:busId',
  '/admin/routes',
  '/admin/routes/:routeId',
  '/admin/trips',
  '/admin/trips/:tripId',
  '/admin/trips/:tripId/manifest',
  '/admin/bookings',
  '/admin/bookings/:bookingId',
  '/admin/revenue',
  '/admin/live-tracking',
  '/admin/assistant',
  '/admin/profile',
])

const driverImplemented = new Set([
  '/driver/dashboard',
  '/driver/trips',
  '/driver/trips/:tripId',
  '/driver/trips/:tripId/active',
  '/driver/profile',
])

const passengerImplemented = new Set([
  '/passenger/dashboard',
  '/passenger/search',
  '/passenger/trips/:tripId',
  '/passenger/trips/:tripId/seats',
  '/passenger/bookings',
  '/passenger/bookings/:bookingId',
  '/passenger/bookings/:bookingId/tracking',
  '/passenger/assistant',
  '/passenger/profile',
])

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            path: '/',
            element: <HomeRoute />,
          },
          {
            path: '/login',
            element: (
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            ),
          },
          {
            path: '/register',
            element: (
              <GuestOnly>
                <RegisterPage />
              </GuestOnly>
            ),
          },
          { path: '/unauthorized', element: <UnauthorizedPage /> },
          { path: '/forbidden', element: <ForbiddenPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: (
          <RequireAuth role="PASSENGER">
            <PassengerLayout />
          </RequireAuth>
        ),
        children: [
          { path: '/passenger', element: <Navigate to="/passenger/dashboard" replace /> },
          { path: '/passenger/dashboard', element: <DashboardPage /> },
          { path: '/passenger/search', element: <SearchPage /> },
          { path: '/passenger/trips/:tripId', element: <TripPage /> },
          { path: '/passenger/trips/:tripId/seats', element: <SeatsPage /> },
          { path: '/passenger/bookings', element: <BookingsPage /> },
          { path: '/passenger/bookings/:bookingId', element: <BookingPage /> },
          { path: '/passenger/bookings/:bookingId/tracking', element: <TrackingPage /> },
          { path: '/passenger/assistant', element: <AssistantPage audience="passenger" /> },
          { path: '/passenger/profile', element: <ProfilePage /> },
          ...placeholderRoutes(passengerPages.filter((page) => !passengerImplemented.has(page.path))),
        ],
      },
      {
        element: (
          <RequireAuth role="DRIVER">
            <DriverLayout />
          </RequireAuth>
        ),
        children: [
          { path: '/driver', element: <Navigate to="/driver/dashboard" replace /> },
          { path: '/driver/dashboard', element: <DriverDashboardPage /> },
          { path: '/driver/trips', element: <TripsPage /> },
          { path: '/driver/trips/:tripId', element: <DriverTripPage /> },
          { path: '/driver/trips/:tripId/active', element: <ActiveTripPage /> },
          { path: '/driver/profile', element: <ProfilePage /> },
          ...placeholderRoutes(driverPages.filter((page) => !driverImplemented.has(page.path))),
        ],
      },
      {
        element: (
          <RequireAuth role="ADMIN">
            <AdminLayout />
          </RequireAuth>
        ),
        children: [
          { path: '/admin', element: <AdminDashboardPage /> },
          { path: '/admin/fleet', element: <FleetPage /> },
          { path: '/admin/fleet/:busId', element: <BusPage /> },
          { path: '/admin/routes', element: <RoutesPage /> },
          { path: '/admin/routes/:routeId', element: <AdminRoutePage /> },
          { path: '/admin/trips', element: <AdminTripsPage /> },
          { path: '/admin/trips/:tripId/manifest', element: <ManifestPage /> },
          { path: '/admin/trips/:tripId', element: <AdminTripPage /> },
          { path: '/admin/bookings', element: <AdminBookingsPage /> },
          { path: '/admin/bookings/:bookingId', element: <AdminBookingPage /> },
          { path: '/admin/revenue', element: <RevenuePage /> },
          { path: '/admin/live-tracking', element: <LiveTrackingPage /> },
          { path: '/admin/assistant', element: <AssistantPage audience="admin" /> },
          { path: '/admin/profile', element: <ProfilePage /> },
          ...placeholderRoutes(adminPages.filter((page) => !adminImplemented.has(page.path))),
        ],
      },
    ],
  },
])
