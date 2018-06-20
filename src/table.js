export default function table(path, map) {
  return (_, source) => {
    return source.fetch(path, map).then(values => ({ values }));
  };
}
