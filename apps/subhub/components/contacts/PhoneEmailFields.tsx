"use client";

import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { fieldAllows, type Manifest } from "@latch/contracts";
import { Can, FieldControl } from "@latch/react";
import { Button, Checkbox, Col, Row, Typography } from "antd";
import {
  Controller,
  useFieldArray,
  type Control,
} from "react-hook-form";

import { RhfInput } from "@/components/form/RhfInput";

type CollectionRow = {
  id?: string;
  label: string;
  is_primary: boolean;
};

type PhoneRow = CollectionRow & { number: string };
type EmailRow = CollectionRow & { address: string };

export type ContactChildCollectionValues = {
  phones: PhoneRow[];
  emails: EmailRow[];
};

export type ContactDetailFormValues = ContactChildCollectionValues & {
  profile: {
    kind: string;
    display_name: string;
    legal_name: string;
    notes: string;
  };
};

type PhoneEmailFieldsProps = {
  control: Control<ContactDetailFormValues>;
  manifest: Manifest;
};

const ReadOnlyCollection = ({
  label,
  rows,
  formatValue,
}: {
  label: string;
  rows: CollectionRow[];
  formatValue: (row: CollectionRow) => string;
}) => (
  <div>
    <Typography.Text type="secondary">{label}</Typography.Text>
    {rows.length === 0 ? (
      <div>
        <Typography.Text>—</Typography.Text>
      </div>
    ) : (
      <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
        {rows.map((row, index) => (
          <li key={row.id ?? `${label}-${index}`}>
            <Typography.Text>
              {row.label ? `${row.label}: ` : ""}
              {formatValue(row)}
              {row.is_primary ? " (primary)" : ""}
            </Typography.Text>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const PhoneFieldsSection = ({
  control,
  manifest,
}: PhoneEmailFieldsProps) => {
  const { fields, append, remove } = useFieldArray({ control, name: "phones" });
  const writable = fieldAllows(manifest, "phones", "write");

  if (!writable) {
    return (
      <ReadOnlyCollection
        label="Phones"
        rows={fields}
        formatValue={(row) => (row as PhoneRow).number}
      />
    );
  }

  return (
    <div>
      <Typography.Text type="secondary">Phones</Typography.Text>
      {fields.length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ margin: "8px 0" }}>
          No entries yet.
        </Typography.Paragraph>
      ) : null}
      {fields.map((item, index) => (
        <Row
          key={item.id}
          gutter={[12, 12]}
          align="middle"
          style={{ marginTop: index === 0 ? 8 : 0, marginBottom: 12 }}
        >
          <Col xs={24} sm={6}>
            <RhfInput
              control={control}
              name={`phones.${index}.label`}
              label="Label"
            />
          </Col>
          <Col xs={24} sm={10}>
            <RhfInput
              control={control}
              name={`phones.${index}.number`}
              label="Number"
            />
          </Col>
          <Col xs={12} sm={5}>
            <Controller
              control={control}
              name={`phones.${index}.is_primary`}
              render={({ field: checkboxField }) => (
                <div style={{ paddingTop: 22 }}>
                  <Checkbox
                    checked={Boolean(checkboxField.value)}
                    onChange={(event) =>
                      checkboxField.onChange(event.target.checked)
                    }
                  >
                    Primary
                  </Checkbox>
                </div>
              )}
            />
          </Col>
          <Col xs={12} sm={3} style={{ paddingTop: 22 }}>
            <Can field="phones" action="write">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label="Remove phone row"
                onClick={() => remove(index)}
              />
            </Can>
          </Col>
        </Row>
      ))}
      <Can field="phones" action="write">
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => append({ label: "", number: "", is_primary: false })}
        >
          Add phone
        </Button>
      </Can>
    </div>
  );
};

const EmailFieldsSection = ({
  control,
  manifest,
}: PhoneEmailFieldsProps) => {
  const { fields, append, remove } = useFieldArray({ control, name: "emails" });
  const writable = fieldAllows(manifest, "emails", "write");

  if (!writable) {
    return (
      <ReadOnlyCollection
        label="Emails"
        rows={fields}
        formatValue={(row) => (row as EmailRow).address}
      />
    );
  }

  return (
    <div>
      <Typography.Text type="secondary">Emails</Typography.Text>
      {fields.length === 0 ? (
        <Typography.Paragraph type="secondary" style={{ margin: "8px 0" }}>
          No entries yet.
        </Typography.Paragraph>
      ) : null}
      {fields.map((item, index) => (
        <Row
          key={item.id}
          gutter={[12, 12]}
          align="middle"
          style={{ marginTop: index === 0 ? 8 : 0, marginBottom: 12 }}
        >
          <Col xs={24} sm={6}>
            <RhfInput
              control={control}
              name={`emails.${index}.label`}
              label="Label"
            />
          </Col>
          <Col xs={24} sm={10}>
            <RhfInput
              control={control}
              name={`emails.${index}.address`}
              label="Address"
            />
          </Col>
          <Col xs={12} sm={5}>
            <Controller
              control={control}
              name={`emails.${index}.is_primary`}
              render={({ field: checkboxField }) => (
                <div style={{ paddingTop: 22 }}>
                  <Checkbox
                    checked={Boolean(checkboxField.value)}
                    onChange={(event) =>
                      checkboxField.onChange(event.target.checked)
                    }
                  >
                    Primary
                  </Checkbox>
                </div>
              )}
            />
          </Col>
          <Col xs={12} sm={3} style={{ paddingTop: 22 }}>
            <Can field="emails" action="write">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label="Remove email row"
                onClick={() => remove(index)}
              />
            </Can>
          </Col>
        </Row>
      ))}
      <Can field="emails" action="write">
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => append({ label: "", address: "", is_primary: false })}
        >
          Add email
        </Button>
      </Can>
    </div>
  );
};

export const PhoneEmailFields = ({
  control,
  manifest,
}: PhoneEmailFieldsProps) => (
  <Row gutter={[16, 24]} style={{ marginTop: 8 }}>
    <Col xs={24} lg={12}>
      <FieldControl manifest={manifest} field="phones">
        <PhoneFieldsSection control={control} manifest={manifest} />
      </FieldControl>
    </Col>
    <Col xs={24} lg={12}>
      <FieldControl manifest={manifest} field="emails">
        <EmailFieldsSection control={control} manifest={manifest} />
      </FieldControl>
    </Col>
  </Row>
);
