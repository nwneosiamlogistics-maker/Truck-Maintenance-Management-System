---
description: Safety Plan Upgrade - Option C (Full Implementation)
---

# Safety Plan Upgrade — Option C

## Phase 1: DriverMatrix Defensive Driving Columns Upgrade
- Expand DriverMatrix Defensive Driving section to show full columns: Plan, Status/120d, Booking Date, Start Date, End Date, Pre Test, Post Test, Trainer
- Add inline "บันทึกอบรม" button that opens Training120Modal
- Data source: Driver.defensiveDriving (already exists in types.ts)

## Phase 2: SafetyPlanTable — Individual/Group Tabs
- Add 3-tab navigation: "ภาพรวมหัวข้อ" (existing), "รายบุคคล" (new), "รายกลุ่ม" (new)
- Individual tab: Dropdown to select driver → show all topics with Plan/Actual for that person
- Group tab: Filter by target group or custom selection → show Driver x Topic compliance matrix
- Both tabs include Plan/Actual recording capability

## Phase 3: Sync SafetyPlan ↔ DriverMatrix
- When TrainingPlan is updated (actual recorded) for Defensive Driving topic → auto-update Driver.defensiveDriving
- When Driver.defensiveDriving is updated via Training120Modal → auto-create/update TrainingPlan
- Bidirectional sync ensures data consistency
