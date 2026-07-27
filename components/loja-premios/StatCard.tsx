type Props = {
  titulo: string;
  valor: string;
  icone?: string;
  subtitulo?: string;
  className?: string;
};

export default function StatCard({
  titulo,
  valor,
  icone,
  subtitulo,
  className = "",
}: Props) {
  return (
    <article className={className}>
      {icone && <div className="lp-icone">{icone}</div>}

      <div>
        <span>{titulo}</span>

        <strong>{valor}</strong>

        {subtitulo && <small>{subtitulo}</small>}
      </div>
    </article>
  );
}