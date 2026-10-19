import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCoordinates, DEFAULT_MAP_CENTER, OSM_ATTRIBUTION, OSM_TILE_URL } from '../services/mapUtils.ts';

test('map coordinate guard accepts finite coordinates including zero and boundaries', () => {
  for (const coords of [{lat:0,lng:0},{lat:6.45,lng:3.46},{lat:-90,lng:-180},{lat:90,lng:180}]) assert.equal(isValidCoordinates(coords), true);
});
test('map coordinate guard rejects malformed, missing, infinite and out-of-range values', () => {
  for (const coords of [null, undefined, [], {}, {lat:NaN,lng:3}, {lat:6,lng:Infinity}, {lat:91,lng:3}, {lat:6,lng:-181}, {lat:'6',lng:3}, {lat:null,lng:3}]) assert.equal(isValidCoordinates(coords), false);
});
test('default center is valid and tile requests use HTTPS with attribution', () => {
  assert.equal(isValidCoordinates({lat:DEFAULT_MAP_CENTER[0],lng:DEFAULT_MAP_CENTER[1]}), true);
  assert.match(OSM_TILE_URL, /^https:\/\//);
  assert.match(OSM_ATTRIBUTION, /openstreetmap.org\/copyright/);
});
