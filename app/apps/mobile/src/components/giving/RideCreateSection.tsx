// The rides part of the create form: route (official places, D71) and schedule (D75), started
// from "publish again" or the last route this device published (spec 05 §5.3 step 1; G49).
import React, { useEffect, type Dispatch, type SetStateAction } from 'react';
import { RIDE_ROUTE_DETAIL_KEYS } from '@kc/domain';
import { takeRideStartDetails } from '../../lib/rides/rideStartDetails';
import { RideRouteFields } from './RideRouteFields';
import { RIDE_SCHEDULE_DETAIL_KEYS, RideScheduleFields } from './RideScheduleFields';

/** Ride detail keys the generic schema fields must not render a second time. */
export const RIDE_CREATE_DETAIL_KEYS: readonly string[] = [...RIDE_ROUTE_DETAIL_KEYS, ...RIDE_SCHEDULE_DETAIL_KEYS];

interface Props {
  readonly details: Record<string, unknown>;
  readonly setDetails: Dispatch<SetStateAction<Record<string, unknown>>>;
  readonly onOriginCity: (city: { id: string; name: string }) => void;
  /** Ride offers carry seats; ride requests do not. */
  readonly isOffer: boolean;
  readonly disabled?: boolean;
}

export function RideCreateSection({ details, setDetails, onOriginCity, isOffer, disabled }: Props) {
  // Start from the queued "publish again" ride or the remembered route, once per form.
  // What the user already typed wins over the seed.
  useEffect(() => {
    let cancelled = false;
    void takeRideStartDetails().then((seed) => {
      if (!cancelled && seed) setDetails((prev) => ({ ...seed, ...prev }));
    });
    return () => {
      cancelled = true;
    };
  }, [setDetails]);

  return (
    <>
      <RideRouteFields details={details} onChange={setDetails} onOriginCity={onOriginCity} disabled={disabled} />
      <RideScheduleFields details={details} onChange={setDetails} withSeats={isOffer} disabled={disabled} />
    </>
  );
}
