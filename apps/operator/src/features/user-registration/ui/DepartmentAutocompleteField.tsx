"use client";

import { useMemo } from "react";
import { Autocomplete, TextField } from "@mui/material";

import type { EmployeeDepartmentOption } from "../model/types";

type DepartmentAutocompleteFieldProps = {
  departmentOptions: EmployeeDepartmentOption[];
  value: string;
  error?: boolean;
  helperText?: string;
  onChange: (value: string) => void;
};

export default function DepartmentAutocompleteField({
  departmentOptions,
  value,
  error = false,
  helperText,
  onChange,
}: DepartmentAutocompleteFieldProps) {
  const selectedValue = useMemo(
    () => departmentOptions.find((departmentOption) => departmentOption.name === value) ?? value,
    [departmentOptions, value],
  );

  return (
    <Autocomplete<EmployeeDepartmentOption, false, false, true>
      freeSolo
      fullWidth
      selectOnFocus
      handleHomeEndKeys
      options={departmentOptions}
      value={selectedValue}
      noOptionsText="一致する部署はありません。この名称で新規登録されます。"
      getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
      isOptionEqualToValue={(option, currentValue) =>
        typeof currentValue !== "string" && option.name === currentValue.name
      }
      onChange={(_event, nextValue) => {
        if (typeof nextValue === "string") {
          onChange(nextValue);
          return;
        }

        onChange(nextValue?.name ?? "");
      }}
      onInputChange={(_event, nextValue) => {
        onChange(nextValue);
      }}
      renderOption={(props, option) => (
        <li {...props}>
          <div className="flex w-full items-center justify-between gap-3">
            <span>{option.name}</span>
            <span className="text-xs text-slate-500">{option.employeeCount}人</span>
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="所属部署"
          required
          fullWidth
          error={error}
          helperText={helperText}
          placeholder="既存部署を選択、または新規部署名を入力"
        />
      )}
    />
  );
}
