export default function Substitutes({ players, used, limit, finished, onSubstitute }) {
  return (
    <div className="ticket-match-bench">
      <span className="bench-label">SUBSTITUTES · {players.length}</span>
      <button type="button" className="substitution-button" disabled={finished || used >= limit || !players.length}
        onClick={onSubstitute}>
        {used >= limit ? `Substitution limit reached · ${used}/${limit}` : `Make substitution · ${used}/${limit} used`}
      </button>
    </div>
  );
}
