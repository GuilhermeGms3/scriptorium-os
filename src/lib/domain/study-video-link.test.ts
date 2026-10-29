import { describe, it, expect } from "vitest";
import { studyVideoId } from "./study-video-link";
describe("bounded user-selected YouTube player", () => {
  it("accepts supported video links without copying arbitrary embed URLs", () => {
    for (const url of [
      "https://youtu.be/abcdefghijk?t=2",
      "https://www.youtube.com/watch?v=abcdefghijk",
      "https://youtube.com/shorts/abcdefghijk",
    ])
      expect(studyVideoId(url)).toBe("abcdefghijk");
  });
  it("rejects scripts, lookalike hosts, credentials, ports and playlist-only links", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://youtu.be/abcdefghijk",
      "https://youtube.com.evil.test/watch?v=abcdefghijk",
      "https://user@youtube.com/watch?v=abcdefghijk",
      "https://youtube.com:444/watch?v=abcdefghijk",
      "https://www.youtube.com/playlist?list=x",
    ])
      expect(studyVideoId(url)).toBeNull();
  });
});
