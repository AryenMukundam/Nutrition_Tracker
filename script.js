const appId = "917bebbb";
const appKey = "1d128ebf7fc8f8d4dcce387219fdd359";
let myChart = null;
let macroChart = null;
let dailyCalorieGoal = 2000;

// Load daily calorie goal from localStorage (if available) and update the input field.
if (localStorage.getItem("dailyCalorieGoal")) {
  dailyCalorieGoal = parseFloat(localStorage.getItem("dailyCalorieGoal"));
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("calorieGoal").value = dailyCalorieGoal;
  });
}

function fetchNutrition() {
  const mealType = document.getElementById("mealType").value;
  let mealInput = document.getElementById("mealInput").value.trim();

  if (!mealInput) {
    alert("Please enter ingredients with quantities (e.g., 1 cup oatmeal).");
    return;
  }

  // Use the input as provided (splitting by commas) so that we continue to work with the same terms.
  const ingredients = mealInput.split(",").map((item) => item.trim());
  const foodData = { title: mealType, ingr: ingredients };
  const url = `https://api.edamam.com/api/nutrition-details?app_id=${appId}&app_key=${appKey}`;

  // Display a loading indicator (spinner + text)
  document.getElementById("mealInfo").innerHTML = `
    <div class="spinner"></div>
    <p>Fetching nutrition data, please wait...</p>
  `;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(foodData),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    })
    .then((data) => {
      // We still use the same property names from the API response.
      if (data.totalNutrients) {
        updateMealInfo(mealType, data, mealInput);
      } else {
        document.getElementById("mealInfo").innerHTML = "";
        alert(
          "Could not fetch nutrition data. Please check the ingredients format."
        );
      }
    })
    .catch((error) => {
      console.error("Error fetching nutrition data:", error);
      document.getElementById("mealInfo").innerHTML = "";
      alert("An error occurred. Please check the console for details.");
    });

  // Clear input after submission.
  document.getElementById("mealInput").value = "";
}

function updateMealInfo(mealType, data, mealInput) {
  const mealDiv = document.getElementById("mealInfo");

  // Use the same terms as returned from the fetch:
  const calories = data.calories || 0;
  const carbs = data.totalNutrients.CHOCDF?.quantity || 0;
  const protein = data.totalNutrients.PROCNT?.quantity || 0;
  const fat = data.totalNutrients.FAT?.quantity || 0;

  mealDiv.innerHTML = `
    <p><strong>Meal Type:</strong> ${mealType}</p>
    <p><strong>Calories:</strong> ${calories.toFixed(2)} kcal</p>
    <p><strong>Carbs:</strong> ${carbs.toFixed(2)} g</p>
    <p><strong>Protein:</strong> ${protein.toFixed(2)} g</p>
    <p><strong>Fat:</strong> ${fat.toFixed(2)} g</p>
  `;

  storeData(mealType, { food: mealInput, calories, carbs, protein, fat });
  displayMeals();
}

function storeData(mealType, mealData) {
  const existingData = JSON.parse(localStorage.getItem("meals")) || {};
  if (!existingData[mealType]) existingData[mealType] = [];
  existingData[mealType].push(mealData);
  localStorage.setItem("meals", JSON.stringify(existingData));
}

function displayMeals() {
  const mealData = JSON.parse(localStorage.getItem("meals")) || {};
  let totalCalories = 0;
  let totalCarbs = 0;
  let totalProtein = 0;
  let totalFat = 0;

  const mealHistoryDiv = document.getElementById("mealHistory");
  mealHistoryDiv.innerHTML = "";

  ["breakfast", "lunch", "dinner"].forEach((mealType) => {
    if (mealData[mealType]) {
      mealData[mealType].forEach((item, index) => {
        mealHistoryDiv.innerHTML += `
          <div class="meal-history-item">
            <p>
              <strong>${mealType.charAt(0).toUpperCase() + mealType.slice(1)}:</strong>
              ${item.food} (${item.calories.toFixed(2)} kcal)
            </p>
            <button onclick="deleteMeal('${mealType}', ${index})">Delete</button>
          </div>
        `;
        totalCalories += item.calories;
        totalCarbs += item.carbs;
        totalProtein += item.protein;
        totalFat += item.fat;
      });
    }
  });

  document.getElementById("totalCalories").innerText =
    `Total Calories: ${totalCalories.toFixed(2)} kcal`;

  const progress = (totalCalories / dailyCalorieGoal) * 100;
  document.getElementById("calorieProgress").style.width = `${Math.min(progress, 100)}%`;
  document.getElementById("calorieProgress").innerText = `${Math.round(progress)}%`;

  updateCharts(totalCarbs, totalProtein, totalFat);
}

function updateCharts(carbs, protein, fat) {
  const mealNames = ["Breakfast", "Lunch", "Dinner"];
  const mealData = JSON.parse(localStorage.getItem("meals")) || {};
  const calorieData = mealNames.map((meal) => {
    return (
      mealData[meal.toLowerCase()]?.reduce(
        (sum, item) => sum + item.calories,
        0
      ) || 0
    );
  });

  if (myChart) myChart.destroy();
  myChart = new Chart(
    document.getElementById("nutritionChart").getContext("2d"),
    {
      type: "bar",
      data: {
        labels: mealNames,
        datasets: [
          {
            label: "Calories per Meal",
            data: calorieData,
            backgroundColor: ["#ffcc00", "#ff5733", "#33b5e5"],
            borderColor: ["#d4a100", "#d43f00", "#1e88e5"],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true } },
      },
    }
  );

  if (macroChart) macroChart.destroy();
  macroChart = new Chart(
    document.getElementById("macronutrientChart").getContext("2d"),
    {
      type: "pie",
      data: {
        labels: ["Carbs", "Protein", "Fat"],
        datasets: [
          {
            label: "Macronutrients (g)",
            data: [carbs, protein, fat],
            backgroundColor: ["#ffcc00", "#33b5e5", "#ff5733"],
          },
        ],
      },
      options: {
        responsive: true,
      },
    }
  );
}

function setGoals() {
  const goalInput = document.getElementById("calorieGoal").value;
  if (goalInput && !isNaN(goalInput)) {
    dailyCalorieGoal = parseFloat(goalInput);
    localStorage.setItem("dailyCalorieGoal", dailyCalorieGoal);
    displayMeals();
  } else {
    alert("Please enter a valid calorie goal.");
  }
}

function deleteMeal(mealType, index) {
  if (!confirm("Are you sure you want to delete this meal?")) return;
  const mealData = JSON.parse(localStorage.getItem("meals")) || {};
  if (mealData[mealType]) {
    mealData[mealType].splice(index, 1);
    localStorage.setItem("meals", JSON.stringify(mealData));
    displayMeals();
  }
}

function clearData() {
  if (!confirm("Are you sure you want to clear all data?")) return;
  localStorage.removeItem("meals");
  displayMeals();
}

displayMeals();
