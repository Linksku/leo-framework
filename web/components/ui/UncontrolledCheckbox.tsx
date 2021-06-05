import Checkbox from './Checkbox';

type Props = {
  defaultChecked?: boolean,
  onInput: React.KeyboardEventHandler,
} & Parameters<typeof Checkbox>[0];

export default function UncontrolledCheckbox({
  defaultChecked = false,
  onInput,
  ...props
}: Props) {
  const [checked, setChecked] = useState(defaultChecked);

  const handleInput = useCallback(e => {
    setChecked(e.target.checked);
    onInput(e);
  }, [onInput]);

  return (
    <Checkbox
      {...props}
      checked={checked}
      onInput={handleInput}
    />
  );
}
