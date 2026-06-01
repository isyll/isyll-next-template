import { check, sleep } from 'k6'
import http from 'k6/http'
import { Trend } from 'k6/metrics'
import type { Options } from 'k6/options'

// k6 runs this in the Goja runtime (not Node). Import only k6/* modules.
const homepageLatency = new Trend('homepage_latency', true)

export const options: Options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp-up
    { duration: '1m', target: 20 }, // steady
    { duration: '20s', target: 0 }, // ramp-down
  ],
  // SLOs — breaching any threshold fails the run (non-zero exit).
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    homepage_latency: ['p(99)<800'],
  },
}

export default function () {
  const baseUrl = __ENV['BASE_URL'] || 'http://localhost:3000'
  const res = http.get(`${baseUrl}/`)
  homepageLatency.add(res.timings.duration)
  check(res, { 'status is 200': (r) => r.status === 200 })
  sleep(1)
}
