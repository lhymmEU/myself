/**
 * Prepended to the first user message of each web-dashboard session so the
 * remote agent learns the [CARD] JSON contract without changing AGENTS.md.
 */
export const BOOTSTRAP_PREAMBLE = [
  "[CHANNEL=web-dashboard]",
  "Replies in this session render in a web chat. Use plain text by default.",
  "For structured content, wrap JSON in either [CARD]…[/CARD] or [BEGIN CARD]…[END CARD]. Example shapes:",
  '  {"kind":"key-value","title"?:string,"items":[{"key":string,"value":string}]}',
  '  {"kind":"list","title"?:string,"items":[string]}',
  '  {"kind":"table","title"?:string,"columns":[string],"rows":[[string]]}',
  '  {"kind":"steps","title"?:string,"items":[{"label":string,"done"?:boolean}]}',
  '  {"kind":"code","language"?:string,"code":string}',
  '  {"kind":"citation","quote":string,"source"?:{"title"?:string,"url"?:string}}',
  '  {"kind":"alert","level":"info"|"warn"|"error","message":string}',
  '  {"kind":"suggestions","prompts":[string]}',
  '  {"kind":"choices","question"?:string,"options":[string],"allowCustom"?:boolean}',
  "Use `choices` when the user must pick a path; the user can also type freely.",
  "Anything outside those tags is plain text. Prefer exactly [CARD] and [/CARD] when possible. Keep prose concise. Do not change persona.",
  "User message follows below.",
  "---",
].join("\n");
