package com.example.travelplanner;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String PREFERENCES = "wayfarer_trips";
    private static final String TRIPS_KEY = "trips";
    private static final int INK = Color.rgb(29, 48, 45);
    private static final int MUTED = Color.rgb(105, 121, 115);
    private static final int TEAL = Color.rgb(12, 91, 86);
    private static final int CORAL = Color.rgb(226, 123, 93);
    private static final int PAPER = Color.rgb(247, 246, 241);

    private LinearLayout tripsContainer;
    private SharedPreferences preferences;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(PAPER);
        getWindow().setNavigationBarColor(PAPER);
        preferences = getSharedPreferences(PREFERENCES, MODE_PRIVATE);
        setContentView(createContent());
    }

    private View createContent() {
        ScrollView scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setBackgroundColor(PAPER);

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(24), dp(28), dp(24), dp(32));
        scrollView.addView(page);

        TextView brand = text("✈  WAYFARER", 13, TEAL, true);
        brand.setLetterSpacing(0.12f);
        page.addView(brand);

        TextView headline = text("Somewhere is\ncalling.", 36, INK, true);
        headline.setLineSpacing(dp(2), 1f);
        addSpace(page, 18);
        page.addView(headline);

        TextView introduction = text(
                "Make room for the places you can't stop thinking about.",
                16, MUTED, false);
        introduction.setLineSpacing(dp(4), 1f);
        addSpace(page, 10);
        page.addView(introduction);

        Button addTrip = new Button(this);
        addTrip.setText("＋   Plan a trip");
        addTrip.setTextColor(Color.WHITE);
        addTrip.setTextSize(16);
        addTrip.setAllCaps(false);
        addTrip.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        addTrip.setGravity(Gravity.CENTER);
        addTrip.setBackground(background(TEAL, 18));
        addTrip.setElevation(dp(2));
        addTrip.setPadding(dp(20), 0, dp(20), 0);
        addSpace(page, 24);
        page.addView(addTrip, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(58)));
        addTrip.setOnClickListener(view -> showAddTripDialog());

        TextView section = text("YOUR TRIPS", 12, MUTED, true);
        section.setLetterSpacing(0.12f);
        addSpace(page, 34);
        page.addView(section);

        tripsContainer = new LinearLayout(this);
        tripsContainer.setOrientation(LinearLayout.VERTICAL);
        addSpace(page, 14);
        page.addView(tripsContainer);
        renderTrips();

        TextView footer = text("Good trips begin with a little daydreaming.", 13, MUTED, false);
        footer.setGravity(Gravity.CENTER);
        addSpace(page, 28);
        page.addView(footer);

        return scrollView;
    }

    private void showAddTripDialog() {
        LinearLayout fields = new LinearLayout(this);
        fields.setOrientation(LinearLayout.VERTICAL);
        fields.setPadding(dp(24), dp(8), dp(24), 0);

        EditText destination = new EditText(this);
        destination.setSingleLine(true);
        destination.setHint("e.g. Kyoto, Japan");
        destination.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        fields.addView(destination, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54)));

        EditText dates = new EditText(this);
        dates.setSingleLine(true);
        dates.setHint("Dates (optional)");
        dates.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        LinearLayout.LayoutParams datesParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(54));
        datesParams.topMargin = dp(8);
        fields.addView(dates, datesParams);

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle("Plan a trip")
                .setView(fields)
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Save trip", null)
                .create();
        dialog.setOnShowListener(ignored -> dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                .setOnClickListener(view -> {
                    String place = destination.getText().toString().trim();
                    if (place.isEmpty()) {
                        destination.setError("Add a destination");
                        return;
                    }
                    saveTrip(place, dates.getText().toString().trim());
                    dialog.dismiss();
                }));
        dialog.show();
    }

    private void saveTrip(String destination, String dates) {
        JSONArray trips = readTrips();
        JSONObject trip = new JSONObject();
        try {
            trip.put("destination", destination);
            trip.put("dates", dates);
            trips.put(trip);
            preferences.edit().putString(TRIPS_KEY, trips.toString()).apply();
            renderTrips();
        } catch (JSONException exception) {
            Toast.makeText(this, "Couldn't save that trip.", Toast.LENGTH_SHORT).show();
        }
    }

    private JSONArray readTrips() {
        try {
            return new JSONArray(preferences.getString(TRIPS_KEY, "[]"));
        } catch (JSONException exception) {
            return new JSONArray();
        }
    }

    private void renderTrips() {
        tripsContainer.removeAllViews();
        JSONArray trips = readTrips();
        if (trips.length() == 0) {
            tripsContainer.addView(createEmptyState());
            return;
        }

        for (int index = 0; index < trips.length(); index++) {
            JSONObject trip = trips.optJSONObject(index);
            if (trip != null) {
                tripsContainer.addView(createTripCard(trip, index + 1));
            }
        }
    }

    private View createEmptyState() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(22), dp(20), dp(22));
        card.setBackground(background(Color.rgb(229, 239, 235), 20));

        TextView icon = text("↗", 27, CORAL, true);
        TextView title = text("Your next chapter starts here.", 18, INK, true);
        TextView detail = text("Add a destination and keep your ideas in one place.",
                14, MUTED, false);
        detail.setLineSpacing(dp(3), 1f);
        card.addView(icon);
        addSpace(card, 10);
        card.addView(title);
        addSpace(card, 6);
        card.addView(detail);
        return card;
    }

    private View createTripCard(JSONObject trip, int number) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(20), dp(18), dp(20), dp(18));
        card.setBackground(background(Color.WHITE, 20));
        card.setElevation(dp(1));

        TextView label = text(String.format("TRIP  %02d", number), 11, CORAL, true);
        label.setLetterSpacing(0.1f);
        TextView destination = text(trip.optString("destination"), 21, INK, true);
        String dates = trip.optString("dates");
        TextView dateLine = text(dates.isEmpty() ? "Dates to be decided" : dates, 14, MUTED, false);

        card.addView(label);
        addSpace(card, 9);
        card.addView(destination);
        addSpace(card, 5);
        card.addView(dateLine);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        params.bottomMargin = dp(12);
        card.setLayoutParams(params);
        return card;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        }
        return view;
    }

    private GradientDrawable background(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radius));
        return drawable;
    }

    private void addSpace(LinearLayout layout, int height) {
        View space = new View(this);
        layout.addView(space, new LinearLayout.LayoutParams(1, dp(height)));
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
