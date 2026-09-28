interface Props {
  name: string
  starred: boolean
  onToggle: () => void
}

/** Adds a drill to My drills or takes it off. */
export function StarButton({ name, starred, onToggle }: Props) {
  return (
    <button
      type="button"
      className={starred ? 'star starred' : 'star'}
      onClick={onToggle}
      aria-pressed={starred}
      aria-label={starred ? `Remove ${name} from My drills` : `Add ${name} to My drills`}
      title={starred ? 'Remove from My drills' : 'Add to My drills'}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"
          fill={starred ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
