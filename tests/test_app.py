from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(app_module, "activities", deepcopy(app_module.activities))
    with TestClient(app_module.app) as test_client:
        yield test_client


def test_get_activities_returns_activity_data(client):
    response = client.get("/activities")

    assert response.status_code == 200
    activities = response.json()
    assert "Chess Club" in activities
    assert activities["Chess Club"]["participants"] == [
        "michael@mergington.edu",
        "daniel@mergington.edu",
    ]


def test_signup_adds_student_to_activity(client):
    email = "new.student@mergington.edu"

    response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json() == {"message": f"Signed up {email} for Chess Club"}
    assert email in client.get("/activities").json()["Chess Club"]["participants"]


@pytest.mark.parametrize(
    ("activity_name", "email", "status_code", "detail"),
    [
        (
            "Chess Club",
            "michael@mergington.edu",
            400,
            "Student is already signed up for this activity",
        ),
        ("Unknown Activity", "new.student@mergington.edu", 404, "Activity not found"),
    ],
)
def test_signup_rejects_duplicate_or_unknown_activity(
    client, activity_name, email, status_code, detail
):
    response = client.post(
        f"/activities/{quote(activity_name, safe='')}/signup",
        params={"email": email},
    )

    assert response.status_code == status_code
    assert response.json()["detail"] == detail


def test_unregister_removes_student_and_all_duplicate_entries(client):
    activity = app_module.activities["Chess Club"]
    email = "michael@mergington.edu"
    activity["participants"].append(email)

    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json() == {"message": f"Unregistered {email} from Chess Club"}
    assert email not in client.get("/activities").json()["Chess Club"]["participants"]


@pytest.mark.parametrize(
    ("activity_name", "email", "detail"),
    [
        ("Unknown Activity", "student@mergington.edu", "Activity not found"),
        (
            "Chess Club",
            "not-registered@mergington.edu",
            "Student is not signed up for this activity",
        ),
    ],
)
def test_unregister_rejects_unknown_activity_or_unregistered_student(
    client, activity_name, email, detail
):
    response = client.delete(
        f"/activities/{quote(activity_name, safe='')}/signup",
        params={"email": email},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == detail
