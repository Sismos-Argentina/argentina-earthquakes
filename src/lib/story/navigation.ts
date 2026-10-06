export type StoryMode = "history" | "explore";
export type StoryState = { mode: StoryMode; guideIndex: number | null };
export type StoryAction = "skip" | "guide" | "next" | "previous" | "free" | "history";

export function navigateStory(state: StoryState, action: StoryAction, stops: number): StoryState {
  switch (action) {
    case "skip": case "free": return { mode: "explore", guideIndex: null };
    case "guide": return { mode: "explore", guideIndex: 0 };
    case "history": return { mode: "history", guideIndex: null };
    case "next": return { mode: "explore", guideIndex: state.guideIndex === null || state.guideIndex + 1 >= stops ? null : state.guideIndex + 1 };
    case "previous": return { mode: "explore", guideIndex: state.guideIndex === null ? null : Math.max(0, state.guideIndex - 1) };
  }
}

export function storyScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "instant" : "smooth";
}
