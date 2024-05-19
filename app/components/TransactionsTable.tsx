import type { Navigation, SubmitFunction, SubmitOptions } from "@remix-run/react";
import { Form, Link, useNavigation, useOutletContext, useSubmit } from "@remix-run/react";
import { Ripple } from "@rmwc/ripple";
import type { SortingState } from "@tanstack/react-table";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { TransactionResponse } from "~/modules/transaction/transaction.schema";
import type { AppContext } from "~/root";
import { formatDate_YYYY_MM_DD } from "~/utils/date.utils";
import { formatNumber } from "~/utils/number.utils";
import EditIcon from "./icons/EditIcon";
import RepeatIcon from "./icons/RepeatIcon";
import TrashIcon from "./icons/TrashIcon";
import { firstLetterToUpperCase } from "~/utils/text.utils";
import { getTransactionColor } from "~/utils/colors.utils";
import { useMemo, useState } from "react";
import Decimal from "decimal.js";

const columnHelper = createColumnHelper<TransactionResponse>();

function getColumns(context: AppContext, navigation: Navigation, submit: SubmitFunction) {
  return [
    columnHelper.accessor("createdAt", {
      header: () => "Date",
      cell: (info) => (
        <div className="text-end">{formatDate_YYYY_MM_DD(new Date(info.getValue()))}</div>
      ),
    }),
    columnHelper.accessor("type", {
      header: () => "Type",
      cell: (info) => <span>{firstLetterToUpperCase(info.getValue())}</span>,
    }),
    columnHelper.accessor("category", {
      header: () => "Category",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("amount", {
      header: () => "Amount",
      cell: (info) => {
        const transactionType = info.row.original.type;
        return (
          <div
            className={getTransactionColor(transactionType) + " text-end tabular-nums"}
          >
            {formatNumber(
              info.getValue().toString(),
              context.userPreferredLocale ?? context.locale
            )}
          </div>
        );
      },
      sortingFn: (a, b) =>
        new Decimal(a.getValue("amount"))
          .sub(new Decimal(b.getValue("amount")))
          .toNumber(),
    }),
    columnHelper.accessor("paymentMode", {
      header: () => "Payment mode",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("description", {
      header: () => "Description",
      cell: (info) => (
        <div className="whitespace-nowrap overflow-hidden text-ellipsis">
          {info.getValue()}
        </div>
      ),
      meta: {
        type: "longText",
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => "",
      meta: {
        type: "actions",
      },
      cell: ({ row }) => {
        const isTransactionUpdateInProgress =
          navigation.state === "submitting" &&
          navigation.formMethod === "DELETE" &&
          navigation.formData?.get("transactionId") === row.id;
        return (
          <span className="flex">
            <Ripple unbounded>
              <Link
                data-test-id={"btn-edit"}
                to={`/transaction/edit/${row.id}`}
                className="flex justify-center items-center p-3"
                title="Edit"
              >
                <EditIcon size={24} />
              </Link>
            </Ripple>
            <Ripple unbounded>
              <Link
                data-test-id={"btn-make-this-recurring"}
                to={`/transaction/recurring/new?amount=${row.getValue(
                  "amount"
                )}&category=${encodeURIComponent(
                  row.getValue("category")
                )}&type=${row.getValue("type")}&paymentMode=${row.getValue(
                  "paymentMode"
                )}&description=${row.getValue("description")}`}
                className="flex justify-center items-center p-3 border-l border-primary focus-border"
                title="Make this recurring"
              >
                <RepeatIcon size={24} />
              </Link>
            </Ripple>

            <Form
              replace
              method="DELETE"
              className="flex cursor-pointer border-l border-primary"
            >
              <input type="hidden" name="transactionId" value={row.id} />
              <Ripple unbounded>
                <button
                  data-test-id={"btn-delete"}
                  className="flex w-full p-3 focus-border rounded-md"
                  type="submit"
                  disabled={isTransactionUpdateInProgress}
                  title="Delete"
                  onClick={(e) => {
                    e.preventDefault();
                    context.setDialogProps({
                      title: "Delete transaction?",
                      message:
                        "Once you delete this transaction, it cannot be recovered. Continue with deletion?",
                      showDialog: true,
                      positiveButton: "Delete",
                      onPositiveClick: () => {
                        const form = new FormData();
                        form.set("transactionId", row.id);
                        const submitOptions: SubmitOptions = {
                          method: "DELETE",
                          replace: true,
                        };
                        submit(form, submitOptions);
                      },
                    });
                  }}
                >
                  <TrashIcon size={24} />
                </button>
              </Ripple>
            </Form>
          </span>
        );
      },
    }),
  ];
}

export default function TransactionsTable({
  transactions,
}: {
  transactions: TransactionResponse[];
}) {
  const context = useOutletContext<AppContext>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const columns = useMemo(() => getColumns(context, navigation, submit), []);
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: transactions,
    columns: columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="sticky p-2 w-full bg-background">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-primary">
              {headerGroup.headers.map((header, index) => (
                <th
                  className={`p-2 ${
                    index === 0 ? "" : "border-l"
                  } border-t border-primary focus-border`}
                  key={header.id}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      {...{
                        className: header.column.getCanSort()
                          ? "cursor-pointer select-none"
                          : "",
                        onClick: header.column.getToggleSortingHandler(),
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: " ▲",
                        desc: " ▼",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-primary hover:bg-elevated-10">
              {row.getVisibleCells().map((cell, index) => (
                <td
                  className={`${
                    index === 0 ? "" : "border-l"
                  } border-primary focus-border ${
                    (cell.column.columnDef.meta as any)?.type === "actions" ? "" : "p-2"
                  } ${
                    (cell.column.columnDef.meta as any)?.type === "longText"
                      ? "max-w-0 whitespace-nowrap overflow-hidden text-ellipsis"
                      : ""
                  }`}
                  key={row.id + cell.column.columnDef.header}
                  title={
                    (cell.column.columnDef.meta as any)?.type === "longText"
                      ? row.original.description?.toString()
                      : ""
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
