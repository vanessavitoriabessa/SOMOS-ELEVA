type Props = {
  status: string;
};

function criarClasseStatus(status: string) {
  return status
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function ProposalStatus({ status }: Props) {
  return (
    <span className={`status status-${criarClasseStatus(status)}`}>
      {status}
    </span>
  );
}