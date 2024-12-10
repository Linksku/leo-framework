import dayjs from 'dayjs';

import useDebugLog from 'core/globalState/useDebugLog';

import styles from './DebugLogPanel.scss';

export default function DebugLogPanel() {
  const [debugLog] = useDebugLog();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
  }, [debugLog]);

  if (!debugLog.length || hidden) {
    return null;
  }
  return (
    <div
      className={styles.container}
      onClick={() => {
        setHidden(true);
      }}
      role="dialog"
    >
      {debugLog.map((item, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <p key={idx}>
          {`[${dayjs(item.time).format('HH:mm:ss')}] ${item.msg}`}
        </p>
      )).reverse()}
    </div>
  );
}
