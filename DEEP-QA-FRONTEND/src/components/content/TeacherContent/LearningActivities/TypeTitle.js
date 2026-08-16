export default function TypeTitle({ name, ratio, quantity = 0 }) {
  return (
    <div className="inline-flex w-full justify-between align-middle ">
      <div>
        <label className="text-lg text-gray-700">
          {name} ({quantity})
        </label>
      </div>
      <div>
        <label className="text-lg text-secondary">{ratio}%</label>
      </div>
    </div>
  )
}
