// A Jira issue number, linked to Jira when the base URL is known.
export default function IssueKey({ issueKey, jiraBaseUrl }) {
  if (!issueKey) return null;
  return jiraBaseUrl ? (
    <a className="issue-key" href={`${jiraBaseUrl}/browse/${issueKey}`} target="_blank" rel="noreferrer">{issueKey}</a>
  ) : (
    <span className="issue-key">{issueKey}</span>
  );
}
