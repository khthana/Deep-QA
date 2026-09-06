import React from 'react'

/**
 * The two fields, and the labels that now name them — #50.
 *
 * Both `htmlFor` attributes pointed at ids the inputs did not carry: the
 * password's read `website-admin`, which is the id from the Flowbite snippet
 * this markup was lifted from and is not on this page at all. A label bound to
 * nothing is not a label. Clicking it moved no focus, and a screen reader read
 * the fields out as an unnamed textbox and an unnamed password field on the
 * one screen every person in the system passes through.
 *
 * Fixing it is two `id` attributes and one corrected `htmlFor`. Nothing moves
 * and nothing is restyled — this is not the redesign the rebuild defers, it is
 * the markup meaning what it already says.
 */
function LoginForm({ handleSubmit, setUsername, setPassword }) {
  return (
    <form
      onSubmit={handleSubmit}
      className="items-center justify-center space-y-6"
    >
      <div>
        <label htmlFor="username" className="text-l mb-2 block text-gray-500">
          Email
        </label>
        <div className="flex">
          <span className="inline-flex items-center rounded-s-md border border-e-0 border-gray-300 px-3 text-sm text-gray-900">
            <svg
              className="h-4 w-4 text-gray-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
            </svg>
          </span>
          <input
            id="username"
            onChange={e => setUsername(e.target.value)}
            type="text"
            className="block w-full min-w-0 flex-1 rounded-none rounded-e-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="engineering@kmitl.ac.th"
          />
        </div>
      </div>
      <div>
        <label htmlFor="password" className="text-l mb-2 block text-gray-500">
          Password
        </label>
        <div className="flex">
          <span className="inline-flex items-center rounded-s-md border border-e-0 border-gray-300 px-3 text-sm text-gray-900">
            <svg
              className="h-4 w-4 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M15.75 1.5a6.75 6.75 0 0 0-6.651 7.906c.067.39-.032.717-.221.906l-6.5 6.499a3 3 0 0 0-.878 2.121v2.818c0 .414.336.75.75.75H6a.75.75 0 0 0 .75-.75v-1.5h1.5A.75.75 0 0 0 9 19.5V18h1.5a.75.75 0 0 0 .53-.22l2.658-2.658c.19-.189.517-.288.906-.22A6.75 6.75 0 1 0 15.75 1.5Zm0 3a.75.75 0 0 0 0 1.5A2.25 2.25 0 0 1 18 8.25a.75.75 0 0 0 1.5 0 3.75 3.75 0 0 0-3.75-3.75Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            id="password"
            onChange={e => setPassword(e.target.value)}
            type="password"
            className="block w-full min-w-0 flex-1 rounded-none rounded-e-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="•••••••••••••"
          />
        </div>
      </div>
      <button
        type="submit"
        // disabled={loading}
        className="w-full rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-primary_hover focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        Login to your account
      </button>
      {/* <Link
        className="w-full text-center inline-flex items-center justify-center text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5"
        to={{
          pathname: "/register",
        }}
      >
        Register
      </Link> */}
    </form>
  )
}

export default LoginForm
