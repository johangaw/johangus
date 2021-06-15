import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { rest } from "msw";
import { setupServer } from "msw/node";
import {
  getTranslations,
  initTranslationsCache,
} from "repositories/translations";
import { DEFAULT_FEATURE_FLAGS } from "services/feature-flags/constants";
import { CustomerType, PaymentType } from "types/utils";
import { StyleProvider, ThemePicker } from "vcc-ui";
import { getRenderer } from "vcc-ui.config";
import IndexPage from "../pages/[market]/order-request/index";

const renderer = getRenderer();

let submittedData;

const server = setupServer(
  rest.get(
    "/api/order-request/se/b2c/cash/configuration/fake-cch-token",
    (req, res, ctx) =>
      res(
        ctx.status(200),
        ctx.json({
          censoredData:
            "Not including the real data here since it may contain personal information",
        })
      )
  ),
  rest.get("/api/order-request/se/places/autocomplete", (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        censoredData:
          "Not including the real data here since it may contain personal information",
      })
    )
  ),
  rest.get("/api/order-request/se/places/location", (req, res, ctx) =>
    res(ctx.status(200), ctx.json({ lat: 59.32932349999999, lng: 18.0685808 }))
  ),
  rest.get("/api/order-request/se/retailers", (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        censoredData:
          "Not including the real data here since it may contain personal information",
      })
    )
  ),
  rest.post("/api/order-request/se/leads", (req, res, ctx) => {
    submittedData = req.body;
    return res(ctx.status(201), ctx.json("Success"));
  })
);

beforeEach(() => {
  submittedData = null;
});

jest.spyOn(window, "scrollTo").mockImplementation(jest.fn());

jest
  .spyOn(require("next/router"), "useRouter")
  .mockReturnValue({ push: jest.fn() });

describe("IndexPage", () => {
  beforeAll(() => server.listen());
  afterAll(() => server.close());
  beforeEach(() => server.resetHandlers());

  describe("when all fields are field out", () => {
    it("will submit the same data every time", async () => {
      initTranslationsCache();
      render(
        <StyleProvider renderer={renderer}>
          <ThemePicker>
            <IndexPage
              cchToken="fake-cch-token"
              customerType={CustomerType.B2C}
              featureFlags={{ ...DEFAULT_FEATURE_FLAGS, useRecaptcha: false }}
              isFleet={false}
              market="se"
              paymentType={PaymentType.CASH}
              translations={getTranslations(
                "se",
                PaymentType.CASH,
                CustomerType.B2C
              )}
            />
          </ThemePicker>
        </StyleProvider>
      );

      fireEvent.change(screen.getByLabelText("Förnamn"), {
        target: { value: "Johan" },
      });
      fireEvent.change(screen.getByLabelText("Efternamn"), {
        target: { value: "Gustavsson" },
      });
      fireEvent.change(screen.getByLabelText("E-postadress"), {
        target: { value: "mail@example.com" },
      });
      fireEvent.change(screen.getByLabelText("Telefon"), {
        target: { value: "+46709154722" },
      });
      fireEvent.change(screen.getByLabelText("Postnummer"), {
        target: { value: "99 999" },
      });

      fireEvent.focus(screen.getByLabelText("Plats"));
      fireEvent.change(screen.getByLabelText("Plats"), {
        target: { value: "Stockholm" },
      });
      fireEvent.click(
        await screen.findByRole("button", { name: /stockholm sverige/i })
      );
      fireEvent.click(
        await screen.findByRole("button", { name: /volvo studio stockholm/i })
      );

      fireEvent.click(screen.getByLabelText("SMS"));
      fireEvent.click(screen.getByRole("button", { name: /skicka begäran/i }));

      await waitFor(() => expect(submittedData).not.toBeNull());

      expect(submittedData).toMatchInlineSnapshot(`
        Object {
          "analytics": Object {
            "gtm": Object {
              "gaClientId": null,
              "gaTrackId": null,
              "gaUserId": null,
            },
            "userAgent": "Mozilla/5.0 (darwin) AppleWebKit/537.36 (KHTML, like Gecko) jsdom/16.4.0",
            "utm": Object {
              "utmCampaign": null,
              "utmContent": null,
              "utmMedium": null,
              "utmSource": null,
              "utmTerm": null,
            },
          },
          "cchToken": "fake-cch-token",
          "customer": Object {
            "email": "mail@example.com",
            "firstName": "Johan",
            "gender": "",
            "lastName": "Gustavsson",
            "nationalId": "",
            "phoneNumber": "+46709154722",
            "postalCode": "99 999",
            "secondLastName": "",
            "title": "",
          },
          "customerCommunication": Object {
            "email": false,
            "phone": false,
            "sms": true,
          },
          "customerType": "b2c",
          "isFleet": false,
          "paymentType": "cash",
          "reCaptchaToken": null,
          "retailer": Object {
            censoredData: 'Not including the real data here since it may contain personal information' 
          },
          "retailerAssistedSales": false,
        }
      `);
    });
  });
});
