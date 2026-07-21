"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { syncPremifyTransactionAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sync..." : "Sync Premify"}
    </button>
  );
}

const initialState = {
  success: false,
  message: "",
};

export default function SyncPremifyButton({
  transactionId,
}: {
  transactionId: number;
}) {
  const [state, formAction] = useActionState(
    syncPremifyTransactionAction,
    initialState
  );

  return (
    <div className="space-y-2">
      <form action={formAction}>
        <input type="hidden" name="transactionId" value={transactionId} />
        <SubmitButton />
      </form>

      {state?.message ? (
        <div
          className={`text-xs font-medium ${
            state.success ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {state.message}
        </div>
      ) : null}
    </div>
  );
}
