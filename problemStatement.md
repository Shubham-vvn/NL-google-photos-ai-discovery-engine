# Problem Statement — Google Photos AI-Powered Discovery Engine

## Context

We are working on a Product Manager project for Google Photos.

Google Photos users accumulate thousands of photos, videos, screenshots, documents, and other visual memories over years.

Traditional search works well when users know exactly what they are looking for. However, retrieval becomes difficult when users remember a photo but cannot precisely describe it.

For example:

- "That small café we went to during our Goa trip."
- "The picture of the medicine I took when I was sick last year."
- "The photo from my friend's birthday where we were sitting outside."
- "That screenshot of the product I wanted to buy."

The user often remembers some aspects of the memory while forgetting others such as:

- Exact date
- Exact location
- Exact words appearing in the image
- Album name
- Filename
- Exact object/person name
- Exact search terminology

The strategic business goal is:

> Increase the percentage of users who successfully retrieve a photo they remember but cannot precisely describe when they start searching.

The challenge is NOT to improve Google Photos search in general.

The goal is to understand how people remember old visual information, how they attempt to retrieve it, where retrieval breaks down, and which problems represent meaningful product opportunities.

---

## Objective

Build an AI-powered Discovery Engine that analyzes real-world public user conversations and feedback about retrieving old or vaguely remembered photos.

The system should go beyond:

- Sentiment analysis
- Simple review summarization
- Keyword extraction
- Generic categorization

It should identify and compare **specific retrieval problems and opportunity areas using evidence from real users.**

The output should help a Product Manager answer:

1. What kinds of photos do people struggle to retrieve?
2. What information do users remember about those photos?
3. What information do they forget?
4. How do they describe their memory when searching?
5. What search/retrieval attempts do they make?
6. Why do those attempts fail?
7. What workarounds do they use?
8. Which retrieval problems appear repeatedly?
9. Which user segments experience these problems?
10. Which opportunity areas deserve deeper user research?

---

## Research Sources

The Discovery Engine should analyze publicly available sources wherever technically and legally possible.

Priority sources:

1. Google Play Store reviews
2. Apple App Store reviews
3. Reddit
4. Google Photos Help/Community discussions
5. YouTube comments
6. Public forums
7. Public social media conversations
8. Other publicly available discussions relevant to Google Photos retrieval

The system should prioritize evidence specifically related to:

- Finding old photos
- Searching memories
- Forgotten dates
- Forgotten locations
- Vague descriptions
- Search failures
- Photo discovery
- Image retrieval
- Searching screenshots/documents
- Searching photos using partial memories
- Difficulty refining unsuccessful searches

Do NOT collect irrelevant generic complaints about:

- App crashes
- Battery consumption
- Pricing
- Storage plans
- General UI complaints
- Backup problems

unless they directly affect photo retrieval.

---

## Core Research Question

The central question is:

> "When users remember that a photo exists but cannot precisely describe it, what information do they remember, what information do they forget, how do they attempt retrieval, and where does the retrieval journey break down?"

---

## Discovery Engine Pipeline

Build the system as an evidence-driven research pipeline:

### 1. Data Collection

Collect publicly available relevant user-generated content.

Each record should ideally contain:

- Source
- URL
- Date
- Original text
- Platform
- User context if publicly available
- Relevant retrieval-related keywords/signals

Do not fabricate missing information.

If a source cannot be accessed, record the limitation.

---

### 2. Relevance Filtering

Use an AI classifier to determine whether a piece of content is actually relevant to vague photo retrieval.

Classification:

#### Relevant

The user is trying to find, remember, search for, or retrieve a photo/video/document but lacks precise information.

#### Potentially Relevant

The content discusses search/discovery difficulties but the retrieval scenario is unclear.

#### Not Relevant

The content is unrelated to photo retrieval.

Store the classification and reasoning.

---

### 3. Retrieval Scenario Extraction

For every relevant user statement, extract the retrieval scenario.

Examples:

#### Travel Memory

"I remember a café from my Goa trip but don't remember the name."

#### Health Memory

"I have a picture of a prescription from last year but can't remember when I took it."

#### Event Memory

"I want the photo from my cousin's wedding where we were all sitting together."

#### Object/Product Memory

"I took a screenshot of shoes I liked but don't remember the brand."

#### Person Memory

"I have a photo with an old colleague but can't remember the event."

#### Document/Screenshot

"I know I saved the screenshot but can't remember what the text said."

Do not force every user statement into predefined categories.

Allow the AI to discover new scenarios.

---

### 4. Memory Signal Extraction

For every retrieval attempt, identify what the user remembers.

Create structured memory signals such as:

- Person
- Relationship
- Place
- Approximate location
- Trip/event
- Time period
- Season
- Occasion
- Object
- Visual appearance
- Color
- Clothing
- Activity
- Emotion/context
- Text/OCR clue
- Brand
- Food
- Landmark
- Document type
- Device/source
- Album
- Other contextual clue

Also identify:

#### Forgotten Information

Examples:

- Exact date forgotten
- Exact location forgotten
- Person name forgotten
- Album forgotten
- Text forgotten
- Brand forgotten
- Event name forgotten

The engine should distinguish:

> What the user remembers

from

> What the user has forgotten.

This distinction is critical.

---

### 5. Search Query / Retrieval Attempt Extraction

Identify how the user actually tried to find the photo.

Examples:

- Keyword search
- Natural language query
- Date-based filtering
- Location search
- Person search
- Album navigation
- Manual scrolling
- Google Lens
- OCR/text search
- Search combinations
- External Google search
- Asking another person
- Giving up

Capture the exact query where available.

Example:

User memory:

> "A café we went to in Goa."

Search attempt:

> "Goa café"

Result:

> Too many results / wrong results.

---

### 6. Failure Point Classification

Identify WHY retrieval failed.

Use the following initial taxonomy, but allow new categories to emerge.

#### A. Memory Expression Failure

The user remembers the image but cannot translate the memory into searchable language.

Example:

"I know what the place looked like but don't know what to type."

#### B. Query Understanding Failure

The user provides useful clues but the search system does not understand their meaning.

#### C. Missing Metadata

Useful information such as location/date/person is absent or inaccurate.

#### D. Semantic Gap

The user's natural-language memory does not map well to the searchable representation of the photo.

#### E. Result Evaluation Failure

Relevant results may exist, but there are too many results or insufficient context to identify the correct one.

#### F. Search Refinement Failure

The first search fails and the user does not know how to refine it.

#### G. Memory Ambiguity

The user's memory itself is incomplete or uncertain.

#### H. Retrieval Fatigue

The user has to manually browse through too many photos.

#### I. Other

Create a new category when evidence does not fit.

Do not force-fit evidence.

---

### 7. Workaround Extraction

Identify what users do when Google Photos search does not work.

Examples:

- Scroll manually through timeline
- Search Google
- Search WhatsApp
- Ask friends/family
- Look through albums
- Use another device
- Search by approximate date
- Search by location
- Use Google Lens
- Give up

Capture the workaround and its frequency.

---

### 8. User Segment Discovery

Identify recurring user segments based on behavior rather than arbitrary demographics.

Potential segments may include:

- Heavy photo archivists
- Frequent travelers
- Parents/families
- Students
- Professionals
- Screenshot-heavy users
- Document-heavy users
- Event-focused users
- Long-term Google Photos users

Do not assume these segments are correct.

The AI should identify segments from the evidence.

For each segment, identify:

- Retrieval frequency
- Typical memory type
- Typical forgotten information
- Typical search behavior
- Failure mode
- Workaround
- Severity

---

### 9. Opportunity Area Detection

Cluster similar retrieval failures into opportunity areas.

Each opportunity area should include:

#### Opportunity Name

Short, descriptive title.

#### User Problem

What users are struggling with.

#### Evidence

Number of relevant observations.

#### Example Quotes

Representative user statements.

#### Memory Pattern

What users remember.

#### Missing Information

What users forget.

#### Current Retrieval Behavior

How they search.

#### Failure Point

Where the journey breaks.

#### Workaround

What they do instead.

#### Affected Segment

Who experiences it.

#### Frequency

How often it appears in the dataset.

#### Severity

How painful the problem appears to users.

#### Confidence

High / Medium / Low based on evidence quality.

---

### 10. Evidence-Based Prioritization

Do NOT simply rank opportunities based on AI intuition.

Create a transparent opportunity scoring framework.

For example:

Opportunity Score can consider:

- Frequency
- Severity
- Evidence strength
- Breadth of affected users
- Retrieval impact
- Existing workaround difficulty

Clearly show the methodology.

Do not manufacture scores without explaining how they were calculated.

---

## Required Outputs

The Discovery Engine should produce the following outputs.

### Output 1 — Evidence Dataset

A structured table containing:

- Source
- URL
- Date
- Original user statement
- Relevance
- Retrieval scenario
- Memory clues
- Forgotten information
- Search attempt
- Failure point
- Workaround
- User segment
- Severity
- Confidence

---

### Output 2 — Retrieval Problem Taxonomy

Create a hierarchical taxonomy of retrieval problems discovered from the data.

Example:

Retrieval Problems

→ Memory Expression

→ Query Understanding

→ Missing Metadata

→ Semantic Gap

→ Result Evaluation

→ Search Refinement

→ Retrieval Fatigue

But modify this taxonomy based on actual evidence.

---

### Output 3 — Memory vs Forgotten Matrix

Create a matrix:

| Retrieval Scenario | What Users Remember | What Users Forget | Search Attempt | Failure |
|---|---|---|---|---|

This should be one of the most important outputs.

---

### Output 4 — Opportunity Map

Create:

| Opportunity | Evidence Count | Typical User | Memory Pattern | Failure Point | Workaround | Severity | Confidence |
|---|---:|---|---|---|---|---|---|

---

### Output 5 — Representative User Quotes

For every major opportunity, provide representative verbatim user statements.

Never fabricate quotes.

Clearly preserve source URLs.

Use short excerpts where necessary.

---

### Output 6 — Retrieval Journey

Model the journey:

Memory → Recall → Query Formation → Search → Results → Evaluation → Refinement → Retrieval

Identify the biggest observed breakdown points.

---

### Output 7 — Segment × Problem Matrix

Create:

| User Segment | Problem 1 | Problem 2 | Problem 3 | Evidence |
|---|---|---|---|---|

This should help identify which segment/problem combination deserves primary research.

---

### Output 8 — Top Opportunity Areas

Identify approximately 5–8 evidence-backed opportunity areas.

For each one provide:

- Problem
- Evidence count
- Representative evidence
- Affected segment
- Failure point
- Existing workaround
- Severity
- Confidence
- Why it may matter

Do NOT recommend a product solution yet.

---

## Critical Research Principle

The Discovery Engine is NOT a solution generator.

Do not jump from:

"Users have difficulty finding photos"

to:

"Build an AI chatbot."

Instead, discover:

> What users remember → what they forget → how they search → where retrieval fails → what they do instead.

Only after this evidence is established should we move toward product opportunities.

---

## AI Requirements

Use an LLM for semantic classification, clustering, extraction, and synthesis.

However:

### Do not hallucinate.

The system must distinguish between:

- Direct evidence
- AI inference
- Hypothesis

Every insight should have evidence attached.

Use confidence labels:

- High
- Medium
- Low

For quantitative claims, always show:

- Numerator
- Denominator
- Source dataset
- Calculation method

Never create statistics without underlying evidence.

Never fabricate:

- Reviews
- Quotes
- URLs
- User behavior
- Survey responses
- Counts
- Percentages

---

## Source Traceability

Every important insight must be traceable to its original source.

For every evidence item store:

- Source platform
- URL
- Date
- Original text
- Extracted insight

A Product Manager should be able to click from:

Insight → Evidence → Original Source.

---

## Dashboard / Interface

Build a clean research dashboard.

Recommended sections:

1. Overview
2. Data Sources
3. Evidence Explorer
4. Retrieval Scenarios
5. Memory Signals
6. Failure Modes
7. User Segments
8. Opportunity Map
9. Retrieval Journey
10. Evidence / Quotes
11. Export

Include filters for:

- Source
- Retrieval scenario
- Memory clue
- Forgotten information
- Failure mode
- Segment
- Severity
- Confidence
- Date

---

## Export

Allow export of:

- CSV
- JSON
- Opportunity report
- Evidence table

The exported data should retain source URLs.

---

## Definition of Done

The Discovery Engine is complete when it can:

1. Collect or ingest public user feedback.
2. Filter for vague-photo-retrieval problems.
3. Extract what users remember.
4. Extract what users forgot.
5. Identify retrieval attempts.
6. Identify retrieval failure points.
7. Identify workarounds.
8. Discover meaningful user segments.
9. Cluster evidence into opportunity areas.
10. Quantify opportunity frequency where data allows.
11. Preserve source traceability.
12. Distinguish evidence from inference.
13. Generate a structured opportunity map.
14. Produce outputs that can directly inform Parts 2–4 of the Google Photos PM assignment.

---

## Important Constraint

Do NOT build the final product solution yet.

Do NOT assume the opportunity is conversational search, multimodal search, an AI agent, or any particular feature.

The purpose of this phase is:

> **Discover the problem before designing the solution.**

The final output of this project should give a Product Manager enough evidence to move confidently from:

**Business Metric → Product Outcomes → User Evidence → Retrieval Failure → Opportunity Area → User Research Hypothesis**

The Discovery Engine should therefore behave like an **AI-powered Product Research Analyst**, not simply a review summarizer.
