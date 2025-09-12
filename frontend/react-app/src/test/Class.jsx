import { useState, useEffect } from "react";
import axios from "axios";

function ClassList(){
    const [classes, setClasses] = useState([]);
    const [name, setName] = useState("");
    const [teacher, setTeacher] = useState("");

    useEffect(() => {
        fetchClasses();
    }, [])
    
    const fetchClasses = async () => {
        const res = await axios.get("http://localhost:4000/classes");
        setClasses(res.data);
    }

    const addClass = async () => {
        await axios.post("http://localhost:4000/classes", { name, teacher });
        setName("");
        setTeacher("");
    }
    return(
        <div style={{ padding: "20px" }}>
            <h2>📚 All Classes</h2>
            <ul>
                {classes.map((c) => (
                <li key={c.id} className="list-group-item">
                    {c.name} (by {c.teacher})
                </li>
                ))}
            </ul>

            <h3>Add a Class</h3>
            <input
                type="text"
                placeholder="Class Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                type="text"
                placeholder="Teacher"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
            />
            <button onClick={addClass}>Add Class</button>
        </div>
    );
}
export default ClassList;