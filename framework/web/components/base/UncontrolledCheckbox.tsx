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

  return (
    <Checkbox
      {...props}
      checked={checked}
      onInput={(e: React.ChangeEvent<HTMLInputElement>) => {
        setChecked(e.target.checked);
        onInput(e);
      }}
    />
  );
}
