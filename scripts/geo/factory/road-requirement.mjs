import { profileFor, allowsNoRoads } from './profile.mjs';

/**
 * The road part of the city proof (scripts/geo/city-generation-proof.mjs).
 *
 * Every city without a profile, and every profile that does not set `extraction.allowNoRoads`, keeps the original rule exactly: the share of road points inside the
 * ground (0 when there are no road points) must be at least 1. A profile that allows no roads (outpost, wilderness: a station on a remote island, a glacier, a reef) is
 * judged the same way while it has any road or track point; with none, it is judged on what a roadless place can show instead: at least as many walkable area labels
 * (the pack districts) as the profile requires (`minimumNeighbourhoodLabels`). Nothing else in the proof is relaxed.
 */
export function roadCheck({ profile, roadPointCount, roadPointsInGround, districtCount }) {
  const coverage = roadPointCount ? roadPointsInGround / roadPointCount : 0;
  if (!allowsNoRoads(profile) || roadPointCount) return { coverage, passed: coverage >= 1, roadless: false };
  const required = profileFor(profile).minimumNeighbourhoodLabels;
  return { coverage, passed: districtCount >= required, roadless: true, requirement: `no mapped road or track: needs ${required} walkable area labels (found ${districtCount})`, walkableAreaLabels: districtCount };
}
