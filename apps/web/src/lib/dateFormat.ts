const pad2 = (value: number) => String(value).padStart(2, '0');

const parseValidDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatDateParts = (date: Date) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return `${year}-${month}-${day}`;
};

export const formatDateLabel = (value?: string | null) => {
  if (!value) return '-';
  const trimmed = value.trim();
  if (!trimmed) return '-';

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const parsed = parseValidDate(trimmed);
  if (!parsed) return '-';
  return formatDateParts(parsed);
};

export const formatDateTimeLabel = (value?: string | null) => {
  if (!value) return '-';
  const trimmed = value.trim();
  if (!trimmed) return '-';

  const parsed = parseValidDate(trimmed);
  if (!parsed) return '-';

  const date = formatDateParts(parsed);
  const hour = pad2(parsed.getHours());
  const minute = pad2(parsed.getMinutes());
  return `${date} ${hour}:${minute}`;
};
