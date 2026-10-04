# AI-Translate-Meeting: Multi-Room & Concurrency Benchmark Report

> **Generated At:** 2026-10-04 13:48:19  
> **API URL:** http://localhost:5000  
> **WebSocket URL:** ws://localhost:8000  
> **Sample Audio:** vi_sample_16k.pcm  

---

## 1. Executive Summary

| Scenario | Rooms | Total Users | Success Rate | TTFS p50 | TTFS p95 | Zero Leakage | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Scenario 1: Single Room High Density Fan-out | 1 | 6 | 100.0% | 71.5 ms | 72.8 ms | PASSED (0) | PASSED |
| Scenario 2: Multi-Room Parallel Isolation (Zero Leakage) | 3 | 9 | 100.0% | 89.5 ms | 169.5 ms | PASSED (0) | PASSED |
| Scenario 3: Multi-Room Scalability Under Load | 5 | 15 | 100.0% | 88.0 ms | 105.8 ms | PASSED (0) | WARNING |

### Resource Utilization: Scenario 1: Single Room High Density Fan-out
| Container | Peak CPU % | Avg CPU % | Peak RAM (MB) |
| :--- | :---: | :---: | :---: |
| ai_translate_web | 0.0% | 0.0% | 8.05 MB |
| ai_translate_api | 40.56% | 8.76% | 150.4 MB |
| ai_translate_ai_service | 429.58% | 386.71% | 858.2 MB |
| ai_translate_livekit | 4.56% | 1.06% | 39.83 MB |
| ai_translate_laya | 0.22% | 0.18% | 1892.35 MB |
| ai_translate_postgres | 8.66% | 2.77% | 62.3 MB |
| ai_translate_redis | 4.73% | 1.54% | 8.47 MB |


### Resource Utilization: Scenario 2: Multi-Room Parallel Isolation (Zero Leakage)
| Container | Peak CPU % | Avg CPU % | Peak RAM (MB) |
| :--- | :---: | :---: | :---: |
| ai_translate_web | 0.0% | 0.0% | 8.05 MB |
| ai_translate_api | 29.12% | 6.54% | 151.5 MB |
| ai_translate_ai_service | 425.87% | 381.39% | 774.5 MB |
| ai_translate_livekit | 4.03% | 0.98% | 39.8 MB |
| ai_translate_laya | 0.5% | 0.24% | 1892.35 MB |
| ai_translate_postgres | 6.19% | 2.48% | 62.6 MB |
| ai_translate_redis | 7.49% | 3.09% | 8.25 MB |


### Resource Utilization: Scenario 3: Multi-Room Scalability Under Load
| Container | Peak CPU % | Avg CPU % | Peak RAM (MB) |
| :--- | :---: | :---: | :---: |
| ai_translate_web | 0.0% | 0.0% | 8.05 MB |
| ai_translate_api | 7.97% | 7.97% | 151.5 MB |
| ai_translate_ai_service | 337.36% | 337.36% | 801.3 MB |
| ai_translate_livekit | 13.13% | 13.13% | 40.03 MB |
| ai_translate_laya | 0.21% | 0.21% | 1892.35 MB |
| ai_translate_postgres | 13.38% | 13.38% | 62.33 MB |
| ai_translate_redis | 0.9% | 0.9% | 8.21 MB |


---

## 2. SLA Criteria & Verification

1. **Time-To-First-Subtitle (TTFS):** SLA Target $\le 2000$ ms (p50).
2. **Cross-Room Zero Leakage:** Subtitles from Room $i MUST NEVER be delivered to Room $j.
3. **Session Stability:** No unexpected WebSocket drops or unhandled HTTP 500 errors.

*Report saved automatically to `benchmark-results/benchmark-report.md`.*
