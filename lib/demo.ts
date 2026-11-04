import type { Brief, Idea } from "./idea.ts";

export function demoIdeas(): Idea[] {
  const entries: { id: string; transcript: string; brief: Brief }[] = [
    { id: "10000000-0000-4000-8000-000000000001", transcript: "I want a small app that suggests dinner using ingredients already in my fridge. Keep it to quick weekday meals.", brief: {
      title: "Dinner from what’s already there", category: "Software", summary: "A small dinner helper that turns a list of ingredients into three realistic weekday meal ideas.",
      improvements: ["Start with typed ingredients and a 20-minute cooking limit.", "Include pantry staples as an editable list instead of assuming everyone has them."],
      research: [{ query: "ingredient based recipe apps food allergy limitations", why: "Compare existing approaches and identify safety constraints." }, { query: "recipe API licensing ingredient search", why: "Check whether a recipe source can support a small prototype." }],
      firstStep: "Use five real fridge lists to sketch three dinner suggestions for each. Ask two people whether they could actually cook one.",
      watchOut: "Ingredient matches do not guarantee safe meals. Ask about allergies and avoid unsupported food-safety claims.",
      handoffPrompt: "I want a simple dinner helper that suggests three quick meals from ingredients I already have. Start by helping me test five realistic ingredient lists and define the smallest useful interface. Optional improvements are a 20-minute limit and editable pantry staples. Verify current recipe API licensing if you research tools. Ask only essential questions; don’t build a full meal-planning platform.",
      scores: { clarity: 5, feasibility: 4, scope: 5, startability: 5 }, rankReason: "A clear problem with a small manual test before any integration work.",
    } },
    { id: "10000000-0000-4000-8000-000000000002", transcript: "Maybe a casual weekend walking club for people who want company without signing up for a gym. Start in one neighborhood.", brief: {
      title: "A neighborhood weekend walking club", category: "Life", summary: "A casual local walking group with one predictable route and a welcoming way for newcomers to join.",
      improvements: ["Choose one accessible route and one recurring meeting time.", "Share the distance, pace, and cancellation plan before people join."],
      research: [{ query: "local walking groups accessible route community", why: "Find existing groups and check whether a nearby gap exists." }, { query: "community event organizer walking group guidance", why: "Learn what organizers should prepare for a small gathering." }],
      firstStep: "Invite three friends to one short trial walk. Ask what would make them return before creating a website or membership system.",
      watchOut: "Weather, accessibility, and unclear meeting instructions can discourage first-time attendees.",
      handoffPrompt: "Help me test a casual weekend walking club in one neighborhood. I want a welcoming first walk, not a large organization. Start with a route-selection checklist, a short invitation, and three questions to ask participants afterward. Optional improvements are a consistent meeting time and clear distance and pace information. Verify any current local guidance you mention and ask only essential questions.",
      scores: { clarity: 4, feasibility: 4, scope: 5, startability: 5 }, rankReason: "Easy to trial with a few people; demand can be tested before building anything.",
    } },
    { id: "10000000-0000-4000-8000-000000000003", transcript: "A reading companion where I can record one thought after finishing a chapter, then revisit the main ideas later.", brief: {
      title: "A small reading reflection companion", category: "Creative", summary: "A personal reading journal that captures one short reflection per chapter and makes it easy to revisit later.",
      improvements: ["Begin with one book and a simple chapter list.", "Preserve the reader’s own words alongside any suggested summary."],
      research: [{ query: "reading journal voice notes book reflection apps", why: "Compare existing journaling flows and find a specific improvement." }, { query: "speech to text privacy personal journal", why: "Understand the privacy tradeoffs of voice-based reflection." }],
      firstStep: "Record a reflection after three chapters using a normal notes app. Check which fields you actually need before designing a custom tool.",
      watchOut: "Over-structuring the journal could turn a relaxing activity into extra work.",
      handoffPrompt: "I want a lightweight reading journal for one short voice reflection after each chapter. Help me test the habit with three chapters before building an app. Suggest a minimal note structure and a useful way to revisit reflections. Optional improvements are a chapter list and summaries that preserve my original meaning. Verify current tool and privacy details if needed, and ask only essential clarifying questions.",
      scores: { clarity: 4, feasibility: 4, scope: 4, startability: 5 }, rankReason: "A bounded habit experiment can show whether a dedicated app would add value.",
    } },
  ];
  return entries.map((entry, index): Idea => {
    const timestamp = new Date(Date.now() - index * 86400000).toISOString();
    return { id: entry.id, title: entry.brief.title, transcript: entry.transcript, brief: entry.brief, status: "inbox", score: Object.values(entry.brief.scores).reduce((a, b) => a + b, 0), revision: 1, createdAt: timestamp, updatedAt: timestamp, demo: true };
  });
}
