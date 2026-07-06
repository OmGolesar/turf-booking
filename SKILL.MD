# TurfX Shared Agent Skillbook (SKILL.md)

Version: 1.0
Project: TurfX
Purpose: Unified operating protocol for Antigravity and Claude Code.

---

# Core Objective

Build TurfX as a premium sports-tech product.

Primary goals:

1. Research world-class UI patterns
2. Build a premium design system
3. Create reusable component architecture
4. Implement high-quality Flutter UI
5. Maintain strict consistency across design and engineering

This document ensures all agents operate under the same standards.

---

# Agent Roles

## Antigravity

Role: Research Architect + Pattern Analyst

Responsibilities:

* Conduct UI/UX research
* Analyze competitors
* Extract visual systems
* Identify component patterns
* Extract spacing systems
* Extract navigation structures
* Analyze user flows
* Compare interaction models
* Document findings

Antigravity does NOT implement production UI unless explicitly asked.

Primary focus:

Research → Structure → Strategy

---

## Claude Code

Role: Execution Engineer + UI Implementer

Responsibilities:

* Execute browser automation
* Capture screenshots
* Organize research assets
* Convert Figma to Flutter
* Build reusable components
* Implement screens
* Maintain code quality
* Validate UI consistency
* Optimize performance

Primary focus:

Execution → Implementation → Validation

---

# Shared Principles

All agents must follow:

1. Never generate generic Material 3 UI.
2. Never invent inconsistent spacing.
3. Never use random colors.
4. Never create duplicate components.
5. Always follow design tokens.
6. Always document findings.
7. Always save outputs in correct directories.
8. Always check previous work before starting.

---

# Project Structure

Root:

/turfx/
/research/
/design/
/implementation/
/docs/
/shared/

---

# Research Folder Structure

/research/
/references/
/airbnb/
/playtomic/
/strava/
/nike/
/booking/
/mobbin/

```
/analysis/
    /airbnb.md
    /playtomic.md
    /strava.md
    /nike.md

/components/
    /cards.md
    /buttons.md
    /search.md
    /navigation.md

/flows/
    /discovery.md
    /booking.md
    /ai_booking.md
```

---

# Design Folder Structure

/design/
/tokens/
colors.md
typography.md
spacing.md
radius.md
shadows.md

```
/components/
    turf_card.fig
    slot_chip.fig
    search_bar.fig
    cta_button.fig
    ai_command_input.fig

/flows/
    discovery.fig
    booking.fig
    ai_booking.fig
```

---

# Implementation Folder Structure

/implementation/
/flutter/
/lib/
/widgets/
/screens/
/themes/
/animations/

---

# Research Workflow

Step 1:
Check existing screenshots.

Before browsing:

Read:

/research/references/

If screenshots already exist:

Do NOT duplicate.

---

Step 2:
Check analysis docs.

Read:

/research/analysis/

If analysis exists:

Extend it.

Do not overwrite.

---

Step 3:
Collect new references.

Priority sources:

1. Playtomic
2. Strava
3. Nike Run Club
4. Airbnb
5. Booking.com
6. Mobbin

---

# Web Browsing Process

Allowed actions:

* Visit websites
* Scroll pages
* Capture sections
* Capture cards
* Capture booking flows
* Capture profile screens
* Capture navigation

Must capture:

* Hero sections
* Cards
* Search flows
* Filters
* Checkout
* Empty states
* Profile pages

Avoid:

* irrelevant pages
* duplicate sections
* ads/popups

---

# Screenshot Standards

Naming format:

{app}-{screen}-{section}-{index}.png

Examples:

airbnb-home-hero-01.png
playtomic-booking-flow-02.png
strava-profile-stats-01.png

Rules:

* lowercase only
* hyphen-separated
* sequential numbering

---

# Screenshot Storage

Save:

/research/references/{app_name}/

Examples:

/research/references/airbnb/
/research/references/strava/

Never save screenshots elsewhere.

---

# Analysis Documentation Format

Each analysis file:

Example:

/research/analysis/playtomic.md

Format:

## Layout System

## Typography

## Color Strategy

## Navigation

## Card Design

## CTA Hierarchy

## Booking Flow

## Motion Patterns

## Design Notes

## Reusable Learnings

---

# Component Extraction Rules

If a reusable component is discovered:

Save:

/research/components/

Examples:

cards.md
slot_chips.md
modals.md

Must include:

* dimensions
* spacing
* hierarchy
* interaction patterns

---

# Handoff Protocol

Before stopping:

Update:

/shared/WORKLOG.md

Format:

Date:
Agent:
Completed:
Pending:
Blocked:
Next Recommended Action:

Example:

Date: 2026-06-27
Agent: Claude Code
Completed:

* Captured Playtomic discovery flow

Pending:

* Booking flow screenshots

Blocked:

* Mobile login wall

Next:

* Capture checkout flow

---

# Resume Protocol

Before resuming:

Read:

1. SKILL.md
2. /shared/WORKLOG.md
3. target folder

If work exists:

Continue.

Never restart.

---

# Duplicate Prevention Rules

Before creating:

Check:

1. filename
2. folder
3. component existence
4. flow existence

If duplicate exists:

Append.

Do not replace.

---

# Error Handling

If page fails:

Retry:

3 times

Retry strategy:

1. refresh
2. wait 3s
3. retry

If still fails:

Log in:

/shared/errors.md

Format:

Source:
URL:
Error:
Timestamp:

---

# Quality Assurance

Before marking complete:

Validate:

[ ] Screenshot is clear
[ ] Correct folder
[ ] Correct naming
[ ] Analysis written
[ ] Components extracted
[ ] Flow documented
[ ] No duplicates
[ ] Worklog updated

---

# Parallel Execution Rules

Allowed:

Antigravity:

* analyzes Playtomic

Claude Code:

* captures Strava

Not allowed:

Both working same source simultaneously.

Divide by source.

Never overlap.

---

# UI Implementation Rules

Claude Code must:

1. Use design tokens only
2. Reuse components
3. Follow Figma hierarchy
4. Avoid generic Material components
5. Maintain performance on low-end devices
6. Preserve visual consistency

---

# Design Philosophy

TurfX must feel:

* athletic
* premium
* instant

Visual inspiration:

70% Nike Run Club
20% Airbnb
10% Linear

This ratio must remain consistent.

---

# Final Rule

If uncertain:

Do not invent.

Research first.
Reuse second.
Implement third.
