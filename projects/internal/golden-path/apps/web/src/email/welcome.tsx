import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import tokens from "@sentra/token/tokens.json" with { type: "json" };

/* Email clients require inline styles; values still come from the Sentra
   token source of truth (tokens.json), never raw literals in this file. */
const color = (name: string): string => {
  const token = (tokens.color as Record<string, { resolved?: string }>)[name];

  if (!token?.resolved) {
    throw new Error(`Unknown design token: ${name}`);
  }

  return token.resolved;
};

const fontFamilySans = (tokens.typography as Record<string, { value: string }>)[
  "--font-family-sans"
].value;

type WelcomeEmailProps = {
  name?: string;
};

export default function WelcomeEmail({ name = "there" }: WelcomeEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to the SAFRS golden path.</Preview>
      <Body
        style={{
          backgroundColor: color("--color-background-surface"),
          fontFamily: fontFamilySans,
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: color("--color-background-canvas"),
            border: `1px solid ${color("--color-border-subtle")}`,
            margin: "0 auto",
            maxWidth: "480px",
            padding: "32px",
          }}
        >
          <Heading
            as="h1"
            style={{
              color: color("--color-text-primary"),
              fontSize: "24px",
              margin: "0 0 16px",
            }}
          >
            Welcome, {name}
          </Heading>
          <Section>
            <Text
              style={{
                color: color("--color-text-secondary"),
                fontSize: "14px",
                lineHeight: "22px",
                margin: 0,
              }}
            >
              Your account is ready. Preview this template locally with{" "}
              <code>pnpm dev:email</code> — no real email is ever sent from
              development.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
